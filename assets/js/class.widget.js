// == Geomap 7.0
// == Author: Vinicius Sousa
// == Contato: https://github.com/VSousa-7
// == Version: 1.1
// == Data: 24/09/2025
// ==
// == Segurança (v1.1 - Mateusrb6):
// ==   - Removido token de API e URL hardcoded do JavaScript.
// ==   - Chamadas à API do Zabbix movidas para o backend PHP (WidgetRouteData),
// ==     que utiliza a sessão autenticada do usuário logado no Zabbix.
// ==   - O JavaScript nunca mais expõe credenciais ao cliente.

class CWidgetGeoMap extends CWidget {

	static ZBX_STYLE_HINTBOX = 'geomap-hintbox';
	
	static SEVERITY_NO_PROBLEMS = -1;
	static SEVERITY_NOT_CLASSIFIED = 0;
	static SEVERITY_INFORMATION = 1;
	static SEVERITY_WARNING = 2;
	static SEVERITY_AVERAGE = 3;
	static SEVERITY_HIGH = 4;
	static SEVERITY_DISASTER = 5;

	/**
	 * Geomap's data from response.
	 *
	 * @type {Object|null}
	 */
	#geomap = null;
	/**
	 * ID of selected host
	 *
	 * @type {string|null}
	 */
	#selected_hostid = null;

	onInitialize() {
		this._map = null;
		this._icons = {};
		this._selected_icons = {};
		this._mouseover_icons = {};
		this._initial_load = true;
		this._home_coords = {};
		this._severity_levels = new Map();

		// [ROTAS] estado para camadas de rotas
		// SEGURANÇA: Não há mais token ou URL de API exposta aqui.
		// Toda comunicação com o Zabbix é feita via backend PHP (WidgetRouteData).
		this._routeLayers = [];
		this._routesLoadedOnce = false;
	}

	promiseReady() {
		if (this._map === null){
			return super.promiseReady();
		}

		return new Promise(resolve => {
			this._map.whenReady(() => {
				super.promiseReady()
					.then(() => setTimeout(resolve, 300));
			});
		});
	}

	getUpdateRequestData() {
		return {
			...super.getUpdateRequestData(),
			initial_load: this._initial_load ? 1 : 0,
			unique_id: this._unique_id
		};
	}

	setContents(response) {
		if (this._initial_load) {
			super.setContents(response);
		}

		if (response.geomap === undefined) {
			this._initial_load = false;
			return;
		}

		this.#geomap = response.geomap;

		if (this.#geomap.config !== undefined) {
			this._initMap(this.#geomap.config);
		}

		this._addMarkers(this.#geomap.hosts);

		// [ROTAS] carrega rotas após markers. Só tenta na primeira renderização
		// (ou sempre que quiser, troque a condição para true)
		if (!this._routesLoadedOnce) {
			this._addRoutes().catch(err => console.error('Erro ao adicionar rotas:', err));
			this._routesLoadedOnce = true;
		}

		if (!this.hasEverUpdated() && this.isReferred()) {
			this.#selected_hostid = this.#getDefaultSelectable();

			if (this.#selected_hostid !== null) {
				this.#updateHintboxes();
				this.#updateMarkers();
				this.#broadcast();
			}
		}
		else if (this.#selected_hostid !== null) {
			this.#updateHintboxes();
			this.#updateMarkers();
		}

		this._initial_load = false;
	}

	#broadcast() {
		this.broadcast({
			[CWidgetsData.DATA_TYPE_HOST_ID]: [this.#selected_hostid],
			[CWidgetsData.DATA_TYPE_HOST_IDS]: [this.#selected_hostid]
		});
	}

	#getDefaultSelectable() {
		return this.#geomap.hosts.length > 0
			? this.#getClosestHost(this.#geomap.config, this.#geomap.hosts).properties.hostid
			: null;
	}

	onReferredUpdate() {
		if (this.#geomap === null) {
			return;
		}

		if (this.#selected_hostid === null) {
			this.#selected_hostid = this.#getDefaultSelectable();

			if (this.#selected_hostid !== null) {
				this.#updateHintboxes();
				this.#updateMarkers();
				this.#broadcast();
			}
		}
	}

	_addMarkers(hosts) {
		this._markers.clearLayers();
		this._clusters.clearLayers();

		this._markers.addData(hosts);
		this._clusters.addLayer(this._markers);
	}

	_initMap(config) {
		const latLng = new L.latLng([config.center.latitude, config.center.longitude]);

		this._home_coords = config.home_coords;

		// Initialize map 
		this._map = L.map(this._unique_id).setView(latLng, config.center.zoom);
		L.tileLayer(config.tile_url, {
			tap: false,
			minZoom: 0,
			maxZoom: parseInt(config.max_zoom, 10),
			minNativeZoom: 1,
			maxNativeZoom: parseInt(config.max_zoom, 10),
			attribution: config.attribution
		}).addTo(this._map);

		this.initSeverities(config.severities);

		// Create cluster
		this._clusters = this._createClusterLayer();
		this._map.addLayer(this._clusters);

		// Create markers.
		this._markers = L.geoJSON([], {
			onEachFeature: (feature, marker) => {
				marker.on('mouseover', () => {
					if (feature.properties.hostid !== this.#selected_hostid) {
						marker.setIcon(this._mouseover_icons[feature.properties.severity]);
					}
				});
				marker.on('mouseout', () => {
					if (feature.properties.hostid !== this.#selected_hostid) {
						marker.setIcon(this._icons[feature.properties.severity]);
					}
				});
			},
			pointToLayer: function (feature, ll) {
				return L.marker(ll, {
					icon: this._icons[feature.properties.severity]
				});
			}.bind(this)
		});

		this._map.setDefaultView(latLng, config.center.zoom);

		// Severity filter.
		this._map.severityFilterControl = L.control.severityFilter({
			position: 'topright',
			checked: config.filter.severity,
			severity_levels: this._severity_levels,
			disabled: this.isEditMode()
		}).addTo(this._map);

		// Navigate
		this._map.navigateHomeControl = L.control.navigateHomeBtn({position: 'topleft'}).addTo(this._map);
		if (Object.keys(this._home_coords).length > 0) {
			const home_btn_title = ('default' in this._home_coords)
				? t('Navigate to default view')
				: t('Navigate to initial view');

			this._map.navigateHomeControl.setTitle(home_btn_title);
			this._map.navigateHomeControl.show();
		}

		this._map.getContainer().focus = () => {};

		// map click.
		this._map.getContainer().addEventListener('click', (e) => {
			if (e.target.classList.contains('leaflet-container') && !this._map.severityFilterControl._disabled) {
				this._map.severityFilterControl.close();
			}
		}, false);

		this._map.getContainer().addEventListener('filter', (e) => {
			this.removeHintBoxes();
			this.updateFilter(e.detail.join(','));
		}, false);

		this._map.getContainer().addEventListener('cluster.click', (e) => {
			const cluster = e.detail;
			const node = cluster.originalEvent.srcElement.classList.contains('marker-cluster')
				? cluster.originalEvent.srcElement
				: cluster.originalEvent.srcElement.closest('.marker-cluster');

			if ('hintBoxItem' in node) {
				return;
			}

			const hintbox = document.createElement('div');
			hintbox.classList.add(CWidgetGeoMap.ZBX_STYLE_HINTBOX);
			hintbox.style.maxHeight = `${node.getBoundingClientRect().top - 27}px`;
			hintbox.append(this.makePopupContent(cluster.layer.getAllChildMarkers().map(o => o.feature)));

			node.hintBoxItem = hintBox.createBox(cluster.originalEvent, node, hintbox, '', true);

			// Adjust hintbox size in case if scrollbar is necessary.
			hintBox.positionElement(cluster.originalEvent, node, node.hintBoxItem);

			// Center hintbox relative to node.
			node.hintBoxItem.position({
				my: 'center bottom',
				at: 'center top',
				of: node,
				collision: 'fit'
			});

			Overlay.prototype.recoverFocus.call({'$dialogue': node.hintBoxItem});
			Overlay.prototype.containFocus.call({'$dialogue': node.hintBoxItem});
		});

		this._markers.on('click keypress', (e) => {
			this.#selected_hostid = e.layer.feature.properties.hostid;

			this.#updateHintboxes();
			this.#updateMarkers();
			this.#broadcast();

			const node = e.originalEvent.srcElement;

			if ('hintBoxItem' in node) {
				return;
			}

			if (e.type === 'keypress') {
				if (e.originalEvent.key !== ' ' && e.originalEvent.key !== 'Enter') {
					return;
				}

				e.originalEvent.preventDefault();
			}

			const hintbox = document.createElement('div');
			hintbox.classList.add(CWidgetGeoMap.ZBX_STYLE_HINTBOX);
			hintbox.style.maxHeight = `${node.getBoundingClientRect().top - 27}px`;
			hintbox.append(this.makePopupContent([e.layer.feature]));

			node.hintBoxItem = hintBox.createBox(e.originalEvent, node, hintbox, '', true);
			e.layer.hintBoxItem = node.hintBoxItem;

			// Adjust hintbox
			hintBox.positionElement(e.originalEvent, node, node.hintBoxItem);

			// Center hintbox
			node.hintBoxItem.position({
				my: 'center bottom',
				at: 'center top',
				of: node,
				collision: 'fit'
			});

			Overlay.prototype.recoverFocus.call({'$dialogue': node.hintBoxItem});
			Overlay.prototype.containFocus.call({'$dialogue': node.hintBoxItem});
		});

		this._map.getContainer().addEventListener('cluster.dblclick', (e) => {
			e.detail.layer.zoomToBounds({padding: [20, 20]});
		});

		this._map.getContainer().addEventListener('contextmenu', (e) => {
			if (e.target.classList.contains('leaflet-container')) {
				const $obj = $(e.target);
				const menu = [{
					label: t('Actions'),
					items: [{
						label: t('Set this view as default'),
						clickCallback: this.updateDefaultView.bind(this),
						disabled: !this._widgetid
					}, {
						label: t('Reset to initial view'),
						clickCallback: this.unsetDefaultView.bind(this),
						disabled: !('default' in this._home_coords)
					}]
				}];

				$obj.menuPopup(menu, e, {
					position: {
						of: $obj,
						my: 'left top',
						at: 'left+'+e.layerX+' top+'+e.layerY,
						collision: 'fit'
					}
				});
			}

			e.preventDefault();
		});

		// Close opened
		this._map
			.on('zoomstart movestart resize', () => this.removeHintBoxes())
			.on('zoomend', () => this.#updateMarkers())
			.on('unload', () => {
				this._markers.clearLayers();
				this._clusters.clearLayers();

				this._initial_load = true;
			});
	}

	onClearContents() {
		if (this._map !== null) {
			this._map.remove();
			this._map = null;
		}
	}

	/**
	 * 
	 *
	 * @param {Object}        config
	 * @param {Array<Object>} hosts
	 *
	 * @returns {Object}
	 */
	#getClosestHost(config, hosts) {
		const center_point = L.latLng(config.center.latitude, config.center.longitude);

		return hosts.reduce((closest, current) => {
			const current_point = L.latLng(current.geometry.coordinates[1], current.geometry.coordinates[0]);
			const closest_point = L.latLng(closest.geometry.coordinates[1], closest.geometry.coordinates[0]);

			return current_point.distanceTo(center_point) < closest_point.distanceTo(center_point)
				? current
				: closest;
		});
	}

	/**
	 * 
	 *
	 * @param {string} hostid
	 */
	#broadcastSelected(hostid) {
		this.#selected_hostid = hostid;

		this.broadcast({
			[CWidgetsData.DATA_TYPE_HOST_ID]: [this.#selected_hostid],
			[CWidgetsData.DATA_TYPE_HOST_IDS]: [this.#selected_hostid]
		});

		this.#updateHintboxes();
		this.#updateMarkers();
	}

	/**
	 * 
	 */
	#updateHintboxes() {
		this._map._container.querySelectorAll('.marker-cluster').forEach((cluster) => {
			if (cluster.hintBoxItem !== undefined) {
				cluster.hintBoxItem[0].querySelectorAll('[data-hostid]').forEach((row) => {
					row.classList.toggle(ZBX_STYLE_ROW_SELECTED, row.dataset.hostid === this.#selected_hostid);
				});
			}
		});

		this._markers.eachLayer((marker) => {
			if (marker.hintBoxItem !== undefined) {
				marker.hintBoxItem[0].querySelectorAll('[data-hostid]').forEach((row) => {
					row.classList.toggle(ZBX_STYLE_ROW_SELECTED, row.dataset.hostid === this.#selected_hostid);
				});
			}
		});
	}

	/**
	 * 
	 */
	#updateMarkers() {
		this._markers.eachLayer((marker) => {
			const {hostid, severity} = marker.feature.properties;

			marker.setIcon(hostid === this.#selected_hostid ? this._selected_icons[severity] : this._icons[severity]);
		});

		this._map.eachLayer((layer) => {
			if (layer.getAllChildMarkers !== undefined) {
				const selected = layer.getAllChildMarkers().some(
					p => p.feature.properties.hostid == this.#selected_hostid
				);

				layer._icon.classList.toggle('selected', selected);
			}
		});
	}

	/**
	 * 
	 *
	 * @returns {CWidgetGeoMap._createClusterLayer.clusters|L.MarkerClusterGroup}
	 */
	_createClusterLayer() {
		const clusters = L.markerClusterGroup({
			showCoverageOnHover: false,
			zoomToBoundsOnClick: false,
			removeOutsideVisibleBounds: true,
			spiderfyOnMaxZoom: false,
			iconCreateFunction: (cluster) => {
				const max_severity = Math.max(...cluster.getAllChildMarkers().map(p => p.feature.properties.severity));
				const color = this._severity_levels.get(max_severity).color;

				return new L.DivIcon({
					html: `
						<div class="cluster-outer-shape">
							<div style="background-color: ${color};">
								<span>${cluster.getChildCount()}</span>
							</div>
						</div>`,
					className: 'marker-cluster',
					iconSize: new L.Point(50, 50)
				});
			}
		});

		// Transform 'clusterclick' event as 'cluster.click' and 'cluster.dblclick' events
		clusters.on('clusterclick clusterkeypress', (e) => {
			if (e.type === 'clusterkeypress') {
				if (e.originalEvent.key !== ' ' && e.originalEvent.key !== 'Enter') {
					return;
				}

				e.originalEvent.preventDefault();
			}

			if ('event_click' in clusters) {
				clearTimeout(clusters.event_click);
				delete clusters.event_click;
				this._map.getContainer().dispatchEvent(
					new CustomEvent('cluster.dblclick', {detail: e})
				);
			}
			else {
				clusters.event_click = setTimeout(() => {
					delete clusters.event_click;
					this._map.getContainer().dispatchEvent(
						new CustomEvent('cluster.click', {detail: e})
					);
				}, 300);
			}
		});

		return clusters;
	}

	/**
	 * Save severity filter values in user profile and update widget
	 *
	 * @param {string} filter
	 */
	updateFilter(filter) {
		updateUserProfile('web.dashboard.widget.geomap.severity_filter', filter, [this._widgetid], PROFILE_TYPE_STR)
			.always(() => {
				if (this._state === WIDGET_STATE_ACTIVE) {
					this._startUpdating();
				}
			});
	}

	/**
	 * Save default view
	 *
	 * @param {string} filter
	 */
	updateDefaultView() {
		const ll = this._map.getCenter();
		const zoom = this._map.getZoom();
		const view = `${ll.lat},${ll.lng},${zoom}`;

		updateUserProfile('web.dashboard.widget.geomap.default_view', view, [this._widgetid], PROFILE_TYPE_STR);
		this._map.setDefaultView(ll, zoom);
		this._home_coords['default'] = true;
		this._map.navigateHomeControl.show();
		this._map.navigateHomeControl.setTitle(t('Navigate to default view'));
	}

	/**
	 * Unset default view
	 *
	 * @returns {undefined}
	 */
	unsetDefaultView() {
		updateUserProfile('web.dashboard.widget.geomap.default_view', '', [this._widgetid], PROFILE_TYPE_STR)
			.always(() => {
				delete this._home_coords.default;
			});

		if ('initial' in this._home_coords) {
			const latLng = new L.latLng([this._home_coords.initial.latitude, this._home_coords.initial.longitude]);
			this._map.setDefaultView(latLng, this._home_coords.initial.zoom);
			this._map.navigateHomeControl.setTitle(t('Navigate to initial view'));
			this._map.setView(latLng, this._home_coords.initial.zoom);
		}
		else {
			this._map.navigateHomeControl.hide();
		}
	}

	/** 
	 * Function to delete all opened hintboxes
	 */
	removeHintBoxes() {
		const markers = this._map._container.parentNode.querySelectorAll('.marker-cluster, .leaflet-marker-icon');
		[...markers].forEach((m) => {
			if ('hintboxid' in m) {
				hintBox.deleteHint(m);
			}
		});
	}

	/**
	 * Create host popup content.
	 *
	 * @param {array} hosts
	 *
	 * @returns {DocumentFragment}
	 */
	makePopupContent(hosts) {
		const makeHostBtn = (host) => {
			const {name, hostid} = host.properties;
			const data_menu_popup = JSON.stringify({type: 'host', data: {hostid: hostid}});
			const btn = document.createElement('a');
			btn.ariaExpanded = false;
			btn.ariaHaspopup = true;
			btn.role = 'button';
			btn.setAttribute('data-menu-popup', data_menu_popup);
			btn.classList.add('link-action');
			btn.href = 'javascript:void(0)';
			btn.textContent = name;

			return btn;
		};

		const makeDataCell = (host, severity) => {
			if (severity in host.properties.problems) {
				const style = this._severity_levels.get(severity).class;
				const problems = host.properties.problems[severity];
				return `<td class="${style}">${problems}</td>`;
			}
			else {
				return `<td></td>`;
			}
		};

		const makeTableRows = () => {
			hosts.sort((a, b) => {
				if (a.properties.name < b.properties.name) {
					return -1;
				}
				if (a.properties.name > b.properties.name) {
					return 1;
				}
				return 0;
			});

			let rows = ``;
			hosts.forEach(host => {
				const row_class = host.properties.hostid === this.#selected_hostid
					? `class="${ZBX_STYLE_ROW_SELECTED}"`
					: '';

				rows += `
					<tr data-hostid="${host.properties.hostid}" ${row_class}>
						<td class="nowrap">${makeHostBtn(host).outerHTML}</td>
						${makeDataCell(host, CWidgetGeoMap.SEVERITY_DISASTER)}
						${makeDataCell(host, CWidgetGeoMap.SEVERITY_HIGH)}
						${makeDataCell(host, CWidgetGeoMap.SEVERITY_AVERAGE)}
						${makeDataCell(host, CWidgetGeoMap.SEVERITY_WARNING)}
						${makeDataCell(host, CWidgetGeoMap.SEVERITY_INFORMATION)}
						${makeDataCell(host, CWidgetGeoMap.SEVERITY_NOT_CLASSIFIED)}
					</tr>`;
			});

			return rows;
		};

		const html = `
			<table class="${ZBX_STYLE_LIST_TABLE}">
			<thead>
			<tr>
				<th>${t('Host')}</th>
				<th>${this._severity_levels.get(CWidgetGeoMap.SEVERITY_DISASTER).abbr}</th>
				<th>${this._severity_levels.get(CWidgetGeoMap.SEVERITY_HIGH).abbr}</th>
				<th>${this._severity_levels.get(CWidgetGeoMap.SEVERITY_AVERAGE).abbr}</th>
				<th>${this._severity_levels.get(CWidgetGeoMap.SEVERITY_WARNING).abbr}</th>
				<th>${this._severity_levels.get(CWidgetGeoMap.SEVERITY_INFORMATION).abbr}</th>
				<th>${this._severity_levels.get(CWidgetGeoMap.SEVERITY_NOT_CLASSIFIED).abbr}</th>
			</th>
			</thead>
			<tbody>${makeTableRows()}</tbody>
			</table>`;

		// Make DOM.
		const dom = document.createElement('template');
		dom.innerHTML = html;

		dom.content.querySelector('tbody').addEventListener('click', e => {
			if (e.target.closest('a') !== null) {
				return;
			}

			const row = e.target.closest('tr');

			if (row !== null) {
				const hostid = row.dataset.hostid;

				if (hostid !== undefined) {
					this.#selected_hostid = hostid;

					this.#updateHintboxes();
					this.#updateMarkers();
					this.#broadcast();
				}
			}
		});

		return dom.content;
	}

	/**
	 * Function creates marker icons and severity-related options
	 *
	 * @param {object} severities
	 */
	initSeverities(severities) {
		const styles = getComputedStyle(this._contents);
		const hover_fill = styles.getPropertyValue('--hover-fill');
		const selected_fill = styles.getPropertyValue('--selected-fill');
		const selected_stroke = styles.getPropertyValue('--selected-stroke');

		for (let i = CWidgetGeoMap.SEVERITY_NO_PROBLEMS; i <= CWidgetGeoMap.SEVERITY_DISASTER; i++) {
			const severity = severities[i];

			this._severity_levels.set(i, {
				name: severity['name'],
				color: severity['color'],
				abbr: severity['name'].charAt(0),
				class: severity['style']
			});

			const tmpl = `
				<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path fill="${severity['color']}" fill-rule="evenodd" clip-rule="evenodd" d="M12 24C12.972 24 18 15.7794 18 12.3C18 8.82061 15.3137 6 12 6C8.68629 6 6 8.82061 6 12.3C6 15.7794 11.028 24 12 24ZM12.0001 15.0755C13.4203 15.0755 14.5716 13.8565 14.5716 12.3528C14.5716 10.8491 13.4203 9.63011 12.0001 9.63011C10.58 9.63011 9.42871 10.8491 9.42871 12.3528C9.42871 13.8565 10.58 15.0755 12.0001 15.0755Z"/>
				</svg>`;

			const selected_tmpl = `
				<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path fill="${selected_fill}" fill-rule="evenodd" clip-rule="evenodd" d="M12 30C13.62 30 22 17.2124 22 11.8C22 6.38761 17.5228 2 12 2C6.47715 2 2 6.38761 2 11.8C2 17.2124 10.38 30 12 30ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"/>
					<path fill="${selected_stroke}" d="M21.5 11.8C21.5 13.0504 21.009 14.7888 20.2033 16.7359C19.4038 18.6682 18.3176 20.7523 17.1775 22.6746C16.0371 24.5971 14.8501 26.3455 13.8535 27.6075C13.3541 28.24 12.9113 28.7391 12.5528 29.0752C12.3729 29.2439 12.2256 29.3607 12.1123 29.4323C11.9844 29.5131 11.9563 29.5 12 29.5V30.5C12.2462 30.5 12.4734 30.387 12.6463 30.2778C12.8337 30.1595 13.0325 29.9963 13.2368 29.8047C13.6467 29.4203 14.1244 28.8781 14.6384 28.2272C15.6687 26.9225 16.8804 25.1356 18.0376 23.1847C19.1949 21.2335 20.3049 19.1059 21.1273 17.1183C21.9436 15.1455 22.5 13.2558 22.5 11.8H21.5ZM12 2.5C17.2563 2.5 21.5 6.67323 21.5 11.8H22.5C22.5 6.10199 17.7894 1.5 12 1.5V2.5ZM2.5 11.8C2.5 6.67323 6.74372 2.5 12 2.5V1.5C6.21058 1.5 1.5 6.10199 1.5 11.8H2.5ZM12 29.5C12.0437 29.5 12.0156 29.5131 11.8877 29.4323C11.7744 29.3607 11.6271 29.2439 11.4472 29.0752C11.0887 28.7391 10.6459 28.24 10.1465 27.6075C9.14988 26.3455 7.96285 24.5971 6.82253 22.6746C5.68238 20.7523 4.59618 18.6682 3.7967 16.7359C2.99104 14.7888 2.5 13.0504 2.5 11.8H1.5C1.5 13.2558 2.05645 15.1455 2.87267 17.1183C3.69505 19.1059 4.80509 21.2335 5.96244 23.1847C7.11961 25.1356 8.33133 26.9225 9.36163 28.2272C9.87559 28.8781 10.3533 29.4203 10.7632 29.8047C10.9675 29.9963 11.1663 30.1595 11.3537 30.2778C11.5266 30.387 11.7538 30.5 12 30.5V29.5ZM15.5 12C15.5 13.933 13.933 15.5 12 15.5V16.5C14.4853 16.5 16.5 14.4853 16.5 12H15.5ZM12 8.5C13.933 8.5 15.5 10.067 15.5 12H16.5C16.5 9.51472 14.4853 7.5 12 7.5V8.5ZM8.5 12C8.5 10.067 10.067 8.5 12 8.5V7.5C9.51472 7.5 7.5 9.51472 7.5 12H8.5ZM12 15.5C10.067 15.5 8.5 13.933 8.5 12H7.5C7.5 14.4853 9.51472 16.5 12 16.5V15.5Z"/>
					<path fill="${severity['color']}" fill-rule="evenodd" clip-rule="evenodd" d="M12 24C12.972 24 18 15.7794 18 12.3C18 8.82061 15.3137 6 12 6C8.68629 6 6 8.82061 6 12.3C6 15.7794 11.028 24 12 24ZM12.0001 15.0755C13.4203 15.0755 14.5716 13.8565 14.5716 12.3528C14.5716 10.8491 13.4203 9.63011 12.0001 9.63011C10.58 9.63011 9.42871 10.8491 9.42871 12.3528C9.42871 13.8565 10.58 15.0755 12.0001 15.0755Z"/>
				</svg>`;

			const mouseover_tmpl = `
				<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path fill="${hover_fill}" fill-rule="evenodd" clip-rule="evenodd" d="M12 30C13.62 30 22 17.2124 22 11.8C22 6.38761 17.5228 2 12 2C6.47715 2 2 6.38761 2 11.8C2 17.2124 10.38 30 12 30ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"/>
					<path fill="${severity['color']}" fill-rule="evenodd" clip-rule="evenodd" d="M12 24C12.972 24 18 15.7794 18 12.3C18 8.82061 15.3137 6 12 6C8.68629 6 6 8.82061 6 12.3C6 15.7794 11.028 24 12 24ZM12.0001 15.0755C13.4203 15.0755 14.5716 13.8565 14.5716 12.3528C14.5716 10.8491 13.4203 9.63011 12.0001 9.63011C10.58 9.63011 9.42871 10.8491 9.42871 12.3528C9.42871 13.8565 10.58 15.0755 12.0001 15.0755Z"/>
				</svg>`;

			this._icons[i] = L.icon({
				iconUrl: 'data:image/svg+xml;base64,' + btoa(tmpl),
				iconSize: [46, 61],
				iconAnchor: [22, 44]
			});

			this._selected_icons[i] = L.icon({
				iconUrl: 'data:image/svg+xml;base64,' + btoa(selected_tmpl),
				iconSize: [46, 61],
				iconAnchor: [22, 44]
			});

			this._mouseover_icons[i] = L.icon({
				iconUrl: 'data:image/svg+xml;base64,' + btoa(mouseover_tmpl),
				iconSize: [46, 61],
				iconAnchor: [22, 44]
			});
		}
	}

	onEdit() {
		if (this._map !== null) {
			this._map.severityFilterControl.close();
			this._map.severityFilterControl.disable();
		}
	}

	hasPadding() {
		return false;
	}



	

    _initAlertCard() {
        if (this._alertCard) return;
        this._alertCard = L.DomUtil.create('div', 'geomap-alert-card', document.body);
        Object.assign(this._alertCard.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '260px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '10px',
            borderRadius: '8px',
            zIndex: 10000,
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px'
        });
        this._alertCard.innerHTML = `<b>Alertas Ativos</b><hr><i>Nenhum alerta</i>`;
    }

    _updateAlertCard() {
        if (!this._alertCard) return;

        const alerts = [];

        // Hosts
        this._markers.eachLayer(layer => {
            const host = layer.feature.properties;
            if (host.problems && Object.keys(host.problems).length > 0) {
                Object.entries(host.problems).forEach(([sev, count]) => {
                    const severity = parseInt(sev);
                    if (severity >= CWidgetGeoMap.SEVERITY_HIGH) {
                        const sevData = this._severity_levels.get(severity);
                        alerts.push({
                            type: 'Host',
                            name: host.name,
                            severity: sevData.name,
                            color: sevData.color,
                            count
                        });
                    }
                });
            }
        });

        // Rotas
        if (this._routeLayers) {
            this._routeLayers.forEach(layerGroup => {
                layerGroup.eachLayer(layer => {
                    const props = layer.feature.properties;
                    if (props.status && props.status !== 'up') {
                        alerts.push({
                            type: 'Rota',
                            name: props.name,
                            severity: props.status.toUpperCase(),
                            color: props.status === 'down' ? 'red' : 'orange'
                        });
                    }
                });
            });
        }

        // Atualiza o card
        if (alerts.length === 0) {
            this._alertCard.innerHTML = `<b>Alertas Ativos</b><hr><i>Nenhum alerta</i>`;
        } else {
            let html = `<b>Alertas Ativos</b><hr>`;
            alerts.forEach(a => {
                html += `<div style="margin-bottom:4px;">
                            <span style="color:${a.color}; font-weight:bold;">[${a.severity}]</span>
                            <span>${a.type}: ${a.name}</span>
                            ${a.count ? `(<b>${a.count}</b>)` : ''}
                         </div>`;
            });
            this._alertCard.innerHTML = html;
        }
    }

    // ---------------- MARKERS ----------------
    _addMarkers(hosts) {
        this._markers.clearLayers();
        this._clusters.clearLayers();
        this._markers.addData(hosts);
        this._clusters.addLayer(this._markers);

        this._markers.eachLayer(layer => {
            const host = layer.feature.properties;
            let popupContent = `<b>${host.name}</b><br>`;

            if (host.problems && Object.keys(host.problems).length > 0) {
                Object.entries(host.problems).forEach(([sev, count]) => {
                    const sevData = this._severity_levels.get(parseInt(sev));
                    popupContent += `<a href="zabbix.php?action=problem.view&filter_set=1&hostids%5B0%5D=${host.hostid}&severities%5B${sev}%5D=1" target="_blank" style="color:${sevData.color};text-decoration:none;"><b>${count}</b> ${sevData.name}</a><br>`;
                });
            } else {
                popupContent += `<i>Sem problemas</i>`;
            }

            layer.bindPopup(popupContent);
        });

        this._updateAlertCard();
    }

    // ---------------- ROUTES ----------------
    // SEGURANÇA: As chamadas à API do Zabbix foram movidas para o backend PHP
    // (actions/WidgetRouteData.php). O JavaScript agora consome um endpoint
    // interno do próprio Zabbix, protegido pela sessão do usuário logado.
    // Nenhum token ou credencial fica exposto no código do cliente.
    async _addRoutes() {
        // Remove layers antigas
        this._routeLayers.forEach(layer => this._map.removeLayer(layer));
        this._routeLayers = [];

        // Carrega GeoJSON das rotas do servidor local
        let geoData;
        try {
            const routeResponse = await fetch('widgets/geomap/assets/data/routes.geojson');
            if (!routeResponse.ok) {
                console.error('Falha ao carregar routes.geojson:', routeResponse.status);
                return;
            }
            geoData = await routeResponse.json();
        } catch (err) {
            console.error('Erro ao carregar routes.geojson:', err);
            return;
        }

        /**
         * Busca o status de um item via backend PHP seguro.
         * O PHP usa a sessão autenticada do usuário — sem token exposto.
         *
         * @param {string|number} itemid
         * @returns {number|null} Severidade do item ou null.
         */
        const fetchItemStatus = async (itemid) => {
            if (!itemid) return null;
            try {
                const params = new URLSearchParams({
                    action: 'item_status',
                });
                // Adiciona os itemids como array
                params.append('itemids[]', itemid);

                const response = await fetch(
                    `zabbix.php?${params.toString()}`,
                    { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
                );

                if (!response.ok) return null;

                const data = await response.json();
                if (!data.result || data.result.length === 0) return null;

                const lastvalue = parseInt(data.result[0].lastvalue, 10);
                if (lastvalue === 2) return CWidgetGeoMap.SEVERITY_DISASTER;
                if (lastvalue === 1) return CWidgetGeoMap.SEVERITY_NO_PROBLEMS;
                return null;
            } catch (error) {
                console.error('Erro ao buscar status da rota:', error);
                return null;
            }
        };

        /**
         * Busca os valores de tráfego (entrada e saída) de um host via backend PHP seguro.
         *
         * @param {string|number} hostid
         * @param {string}        key_in    Chave do item de tráfego de entrada.
         * @param {string}        key_out   Chave do item de tráfego de saída.
         * @returns {{ in: string, out: string }}
         */
        const fetchTrafficValues = async (hostid, key_in, key_out) => {
            const indisponivel = '<i>Indisponível</i>';
            if (!hostid || (!key_in && !key_out)) {
                return { in: indisponivel, out: indisponivel };
            }

            try {
                const params = new URLSearchParams({
                    action: 'item_traffic',
                    hostid,
                    key_in:  key_in  || '',
                    key_out: key_out || '',
                });

                const response = await fetch(
                    `zabbix.php?${params.toString()}`,
                    { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
                );

                if (!response.ok) return { in: indisponivel, out: indisponivel };

                const data = await response.json();
                const indexed = data.result || {};

                const formatBps = (val) => {
                    if (val === undefined || val === null) return indisponivel;
                    const gbps = (parseFloat(val) / 1_000_000_000).toFixed(2);
                    return `${gbps} Gbps`;
                };

                return {
                    in:  formatBps(indexed[key_in]),
                    out: formatBps(indexed[key_out]),
                };
            } catch (err) {
                console.error('Erro ao buscar tráfego:', err);
                return { in: indisponivel, out: indisponivel };
            }
        };

        // Cria GeoJSON layer com as rotas
        const geojsonLayer = L.geoJSON(geoData, {
            style: { color: '#999999', weight: 6, opacity: 1.0 },
            onEachFeature: (feature, layer) => {
                const { name, itemid, hostid, key_traffic_in, key_traffic_out } = feature.properties;
                layer.bindPopup(`<b>Carregando dados da rota...</b>`);
                layer.on('mouseover', function (e) { this.openPopup(e.latlng); });
                layer.on('mouseout', function () { this.closePopup(); });

                const updateLayerData = async () => {
                    // Faz as duas chamadas ao backend PHP em paralelo
                    const [severity, traffic] = await Promise.all([
                        fetchItemStatus(itemid),
                        fetchTrafficValues(hostid, key_traffic_in, key_traffic_out),
                    ]);

                    const severityInfo = this._severity_levels.get(severity ?? CWidgetGeoMap.SEVERITY_AVERAGE)
                        || { color: '#999999', name: 'Desconhecido' };

                    feature.properties.status = severity === CWidgetGeoMap.SEVERITY_NO_PROBLEMS ? 'up' : 'down';

                    const statusText = severity === CWidgetGeoMap.SEVERITY_NO_PROBLEMS
                        ? `<span style="color:${severityInfo.color}"><b>UP</b></span>`
                        : `<span style="color:${severityInfo.color}"><b>${severityInfo.name}</b></span>`;

                    const popupContent = `
                        <b>Rota:</b> ${name}<br>
                        <b>Status:</b> ${statusText}<br>
                        <b>Tráfego In:</b> ${traffic.in}<br>
                        <b>Tráfego Out:</b> ${traffic.out}
                    `;

                    layer.setStyle({ color: severityInfo.color, weight: 6, opacity: 1.0 });
                    layer.setPopupContent(popupContent);

                    this._updateAlertCard();
                };

                // Chamada inicial e atualização periódica (30 segundos)
                updateLayerData();
                setInterval(updateLayerData, 30_000);
            }
        });

        geojsonLayer.addTo(this._map);
        this._routeLayers.push(geojsonLayer);
    }

    // ---------------- MAP INIT ----------------
    _initMap(config) {
        const latLng = new L.latLng([config.center.latitude, config.center.longitude]);
        this._home_coords = config.home_coords;
        this._map = L.map(this._unique_id).setView(latLng, config.center.zoom);

        L.tileLayer(config.tile_url, {
            tap: false,
            minZoom: 0,
            maxZoom: parseInt(config.max_zoom, 10),
            attribution: config.attribution
        }).addTo(this._map);

        this.initSeverities(config.severities);
        this._clusters = this._createClusterLayer();
        this._map.addLayer(this._clusters);

        this._markers = L.geoJSON([], {
            pointToLayer: (point, ll) => {
                const zoom = this._map.getZoom();
                const size = zoom < 10 ? 20 : 40;
                const icon = this._icons[point.properties.severity] || this._icons[0];
                return L.marker(ll, {
                    icon: L.icon({
                        iconUrl: icon.options.iconUrl,
                        iconSize: [size, size],
                        iconAnchor: [size / 2, size]
                    })
                });
            }
        });

        this._map.on('zoomend', () => {
            this._markers.eachLayer(layer => {
                const zoom = this._map.getZoom();
                const size = zoom < 10 ? 20 : 40;
                const icon = this._icons[layer.feature.properties.severity] || this._icons[0];
                layer.setIcon(L.icon({
                    iconUrl: icon.options.iconUrl,
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size]
                }));
            });
        });

        this._map.setDefaultView(latLng, config.center.zoom);
    }

    _createClusterLayer() {
        const clusters = L.markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: false,
            removeOutsideVisibleBounds: true,
            spiderfyOnMaxZoom: false,
            iconCreateFunction: (cluster) => {
                const max_severity = Math.max(...cluster.getAllChildMarkers().map(p => p.feature.properties.severity));
                const color = this._severity_levels.get(max_severity)?.color || '#666666';
                return new L.DivIcon({
                    html: `<div style="background-color: ${color};"><span>${cluster.getChildCount()}</span></div>`,
                    className: 'marker-cluster',
                    iconSize: new L.Point(40, 40)
                });
            }
        });

        clusters.on('clusterclick', (event) => {
            const cluster = event.layer;
            const markers = cluster.getAllChildMarkers();
            let popupHtml = '<div><strong>Hosts no cluster:</strong><table style="width:100%; border-collapse: collapse;">';
            popupHtml += `<thead><tr><th style="text-align:left; padding: 4px;">Host</th><th style="padding: 4px;">Status</th><th style="padding: 4px;">Incidentes</th></tr></thead><tbody>`;
            markers.forEach(marker => {
                const host = marker.feature.properties;
                let statusText = '<span style="color: green;">OK</span>';
                let incidentesText = '<span style="color: gray;">Nenhum</span>';
                if (host.problems && Object.keys(host.problems).length > 0) {
                    const severities = Object.keys(host.problems).map(s => parseInt(s));
                    const maxSeverity = Math.max(...severities);
                    const sevData = this._severity_levels.get(maxSeverity);
                    statusText = `<span style="color:${sevData.color}; font-weight:bold;">${sevData.name}</span>`;
                    const totalProblemas = Object.values(host.problems).reduce((a, b) => a + b, 0);
                    incidentesText = `<a href="zabbix.php?action=problem.view&filter_set=1&hostids%5B0%5D=${host.hostid}" target="_blank" style="color:${sevData.color}; font-weight:bold; text-decoration:none;">${totalProblemas}</a>`;
                }
                popupHtml += `
                    <tr>
                        <td style="padding: 4px;">
                            <a href="zabbix.php?action=host.view&hostid=${host.hostid}" target="_blank" style="color:inherit; text-decoration:none;">
                                ${host.name}
                            </a>
                        </td>
                        <td style="padding: 4px;">${statusText}</td>
                        <td style="padding: 4px; text-align: center;">${incidentesText}</td>
                    </tr>`;
            });
            popupHtml += '</tbody></table></div>';
            L.popup().setLatLng(cluster.getLatLng()).setContent(popupHtml).openOn(this._map);
        });

        return clusters;
    }

    initSeverities(severities) {
        for (let i = CWidgetGeoMap.SEVERITY_NO_PROBLEMS; i <= CWidgetGeoMap.SEVERITY_DISASTER; i++) {
            const severity = severities[i];
            this._severity_levels.set(i, {
                name: severity.name,
                color: severity.color,
                abbr: severity.name.charAt(0),
                class: severity.style
            });
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='16' fill='${severity.color}' stroke='black' stroke-width='2'/></svg>`;
            this._icons[i] = L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(svg.trim()),
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });
        }
    }
}


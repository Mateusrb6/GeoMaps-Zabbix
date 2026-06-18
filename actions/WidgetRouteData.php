<?php declare(strict_types=0);
/*
** Copyright (C) 2001-2025 Zabbix SIA
**
** This program is free software: you can redistribute it and/or modify it under the terms of
** the GNU Affero General Public License as published by the Free Software Foundation, version 3.
**
** This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
** without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
** See the GNU Affero General Public License for more details.
**
** You should have received a copy of the GNU Affero General Public License along with this program.
** If not, see <https://www.gnu.org/licenses/>.
**/

/**
 * WidgetRouteData — endpoint seguro para dados de rotas do GeoMap.
 *
 * Substitui as chamadas diretas à API do Zabbix feitas no JavaScript com
 * token hardcoded. Toda a comunicação com a API é feita aqui, no backend,
 * reutilizando a sessão autenticada do usuário logado no Zabbix.
 *
 * Parâmetros GET aceitos:
 *   - action     : "item_status" | "item_traffic"
 *   - itemids[]  : lista de itemids (para item_status)
 *   - hostid     : hostid (para item_traffic)
 *   - key_in     : chave do item de tráfego de entrada (para item_traffic)
 *   - key_out    : chave do item de tráfego de saída (para item_traffic)
 */

namespace Widgets\Geomap\Actions;

use API,
	CControllerDashboardWidgetView,
	CControllerResponseData;

class WidgetRouteData extends \CController {

	protected function init(): void {
		// Este endpoint não modifica estado — apenas leitura.
		$this->disableCsrfValidation();
	}

	protected function checkInput(): bool {
		$fields = [
			'action'   => 'required|string|in item_status,item_traffic',
			'itemids'  => 'array_id',
			'hostid'   => 'id',
			'key_in'   => 'string',
			'key_out'  => 'string',
		];

		$ret = $this->validateInput($fields);

		if (!$ret) {
			$this->setResponse(
				new \CControllerResponseData(['error' => 'Parâmetros inválidos.'])
			);
		}

		return $ret;
	}

	protected function checkPermissions(): bool {
		// O usuário deve estar autenticado. Permissões de leitura nos hosts
		// são verificadas implicitamente pela API do Zabbix abaixo.
		return $this->checkAccess(CRoleHelper::UI_MONITORING_HOSTS);
	}

	protected function doAction(): void {
		$action = $this->getInput('action');

		switch ($action) {
			case 'item_status':
				$result = $this->getItemStatus();
				break;

			case 'item_traffic':
				$result = $this->getItemTraffic();
				break;

			default:
				$result = ['error' => 'Ação desconhecida.'];
		}

		// Retorna JSON diretamente, pois este é um endpoint de dados (AJAX).
		header('Content-Type: application/json; charset=UTF-8');
		echo json_encode($result);
		exit;
	}

	/**
	 * Busca o último valor de um ou mais itens para determinar status da rota.
	 * Usa a API do Zabbix com a sessão do usuário já autenticado — sem token exposto.
	 */
	private function getItemStatus(): array {
		$itemids = $this->getInput('itemids', []);

		if (empty($itemids)) {
			return ['result' => []];
		}

		$items = API::Item()->get([
			'output'    => ['itemid', 'lastvalue'],
			'itemids'   => $itemids,
			// A API filtra automaticamente o que o usuário tem permissão de ver.
		]);

		return ['result' => $items];
	}

	/**
	 * Busca os valores de tráfego (entrada e saída) de um host por chave de item.
	 */
	private function getItemTraffic(): array {
		$hostid  = $this->getInput('hostid', 0);
		$key_in  = $this->getInput('key_in', '');
		$key_out = $this->getInput('key_out', '');

		if (!$hostid) {
			return ['result' => []];
		}

		$keys = array_filter([$key_in, $key_out]);

		if (empty($keys)) {
			return ['result' => []];
		}

		$items = API::Item()->get([
			'output'   => ['itemid', 'key_', 'lastvalue'],
			'hostids'  => [$hostid],
			'filter'   => ['key_' => $keys],
		]);

		// Indexa por chave para facilitar o retorno.
		$indexed = [];
		foreach ($items as $item) {
			$indexed[$item['key_']] = $item['lastvalue'];
		}

		return ['result' => $indexed];
	}
}

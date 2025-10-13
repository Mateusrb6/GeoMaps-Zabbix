<?php
/**
 * Render do widget GeoMap customizado
 * Compatível com Zabbix 7.0
 */

$this->addJsFile('widgets/custom/geomap/assets/js/class.widget.js');
$this->addCssFile('widgets/custom/geomap/assets/css/style.css');

$unique_id = $data['unique_id'] ?? uniqid('geomap_');
?>

<div id="<?= $data['uniqueid'] ?>" class="geomap-widget" style="width:100%; height:500%;">
    <!-- O mapa será carregado aqui -->
</div>


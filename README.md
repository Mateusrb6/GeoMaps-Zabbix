# 🗺️ Zabbix Module – GeoMap



[![License: GPL v2](https://img.shields.io/badge/License-GPLv2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
[![Zabbix](https://img.shields.io/badge/Zabbix-7.0%2B-red)](https://www.zabbix.com/)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)](#)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)](#)
[![Last Commit](https://img.shields.io/github/last-commit/VSousa-7/GeoMaps-Zabbix)](https://github.com/VSousa-7/GeoMaps-Zabbix/commits/main)

---

## 🌍 Visão Geral
O **GeoMap** é um módulo desenvolvido com base no módulo **GeoMaps** nativo do Zabbix.  
Ele oferece uma forma **interativa e visual** de exibir:

- **Hosts monitorados** diretamente no mapa  
- **Rotas de rede** (ex: enlaces de fibra óptica)  
- **Incidentes e alertas ativos**, com destaque visual  

O objetivo é fornecer uma **visão geográfica dinâmica** da infraestrutura monitorada, facilitando a **detecção e análise de falhas em tempo real**.

---

## 🖼️ Demonstração Visual
### Screenshot Incidentes

<img width="959" height="493" alt="image" src="https://github.com/user-attachments/assets/c1acd49d-0020-492b-8048-f505e96efc13" />


### Modulo de Interação



https://github.com/user-attachments/assets/a169044d-2fa0-40e1-bef5-6f0ffa9d215b



---

## ⚙️ Recursos Principais
| Recurso | Descrição |
|---------|-----------|
| GeoJSON | Exibição de rotas e enlaces personalizados |
| API Zabbix | Integração nativa para atualizar hosts, rotas e status |
| Atualização em tempo real | Dados refletidos instantaneamente no mapa |
| Temas claro/escuro | Compatível com interface clara e escura |
| Interface interativa | Responsiva, baseada em Leaflet + JavaScript |

---

## 📦 Requisitos e Compatibilidade

| Componente | Versão mínima |
|------------|---------------|
| Zabbix Server | 7.0 |
| PHP | 8.1+ |
| Leaflet.js | 1.9+ |

---

## 📥 Instalação

Clone o módulo no diretório de módulos do Zabbix:

```bash
cd /usr/share/zabbix/modules/
git clone https://github.com/vinicius-sousa/zabbix-module-geomap.git
```

```
1. Reinicie o Zabbix Frontend.
2. Acesse Administração → Módulos e habilite o GeoMap.
   ⚠️ Desative temporariamente o módulo nativo GeoMaps.
3. Atualize o dashboard para visualizar o widget.
```
🛠️ Configuração do módulo
1. Arquivo JavaScript principal

Após a instalação, edite o arquivo:
``` 
/usr/share/zabbix/widgets/geomap/assets/js/class.widget.js
```

Dentro dele, você pode configurar:

Endpoints de API personalizados (caso queira integração dinâmica)

Parâmetros de atualização automática

Estilos e ícones de hosts

## Arquivo de rotas GeoJSON

Adicione o seu arquivo de rotas no caminho:
```
/usr/share/zabbix/modules/geomap/assets/data/routes.geojson
```

O arquivo deve conter as rotas e enlaces de rede no formato GeoJSON.
Exemplo simples de estrutura:

```
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Rota 01 - Matriz → Filial A",
        "status": "up"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-39.312, -4.220],
          [-39.521, -4.170]
        ]
      }
    }
  ]
}
```

💡 Dica: mantenha o nome do arquivo como routes.geojson, pois o módulo faz a leitura direta desse nome.
⚠️ Troubleshooting

Mapa não aparece → verifique permissões e cache do navegador

Dados desatualizados → confirme se a API do Zabbix está acessível

Incidentes não aparecem → cheque a configuração de triggers e grupos no Zabbix



👨‍💻 Autor

Vinicius Sousa

LinkedIn: https://www.linkedin.com/in/vin%C3%ADcius-sousa-903ba6180/

E-mail: viniciussousati60@gmail.com

📄 Licença

Este projeto é distribuído sob a licença GNU GPL v2.
Veja o arquivo LICENSE
 para mais detalhes.

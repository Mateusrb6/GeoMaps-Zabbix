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
### Screenshot
![Mapa de Hosts e Rotas](assets/screenshot.png)  

### GIF de Interação
![Exemplo Interativo](assets/demo.gif)  

> Substitua `https://github.com/user-attachments/assets/82049fb0-fd0a-4c89-ab07-bd140a602548)` pelos arquivos reais no seu repositório.

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

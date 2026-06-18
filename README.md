# 🗺️ Zabbix Module – GeoMap

[![License: GPL v2](https://img.shields.io/badge/License-GPLv2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
[![Zabbix](https://img.shields.io/badge/Zabbix-7.0%2B-red)](https://www.zabbix.com/)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)](#)
[![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)](#)
[![PHP](https://img.shields.io/badge/Language-PHP-8892BF.svg)](#)
[![Fork](https://img.shields.io/badge/Fork%20de-VSousa--7%2FGeoMaps--Zabbix-orange)](https://github.com/VSousa-7/GeoMaps-Zabbix)
[![Last Commit](https://img.shields.io/github/last-commit/Mateusrb6/GeoMaps-Zabbix)](https://github.com/Mateusrb6/GeoMaps-Zabbix/commits/main)

---

## 🔱 Sobre esta Fork

Este repositório é uma **fork com foco em segurança** do projeto original [VSousa-7/GeoMaps-Zabbix](https://github.com/VSousa-7/GeoMaps-Zabbix).

O projeto original introduziu funcionalidades muito úteis — como a exibição de **rotas de rede** (enlaces de fibra óptica) e **status de tráfego em tempo real** no mapa do Zabbix. Porém, a implementação original expunha um **token de API do Zabbix e a URL do servidor diretamente no código JavaScript**, tornando essas credenciais visíveis a qualquer pessoa com acesso ao navegador.

**O propósito desta fork é corrigir essa falha e servir como referência segura de implementação**, sem perder nenhuma funcionalidade.

### O que foi alterado nesta fork

| Arquivo | Alteração |
|---|---|
| `assets/js/class.widget.js` | Removido `_apiAuthToken` e `_apiUrl` hardcoded. Chamadas à API migradas para o backend PHP. |
| `actions/WidgetRouteData.php` | **Novo arquivo.** Endpoint PHP seguro que intermedia as chamadas à API do Zabbix usando a sessão do usuário logado. |
| `manifest.json` | Registrada a nova action `widget.geomap.route_data`. |

---

## 🌍 Visão Geral

O **GeoMap** é um módulo desenvolvido com base no módulo **GeoMaps** nativo do Zabbix.
Ele oferece uma forma **interativa e visual** de exibir:

- **Hosts monitorados** diretamente no mapa
- **Rotas de rede** (ex: enlaces de fibra óptica) com status colorido por severidade
- **Tráfego de entrada e saída** (em Gbps) por rota, exibido no popup ao passar o mouse
- **Incidentes e alertas ativos**, com destaque visual no card de alertas

O objetivo é fornecer uma **visão geográfica dinâmica** da infraestrutura monitorada, facilitando a **detecção e análise de falhas em tempo real**.

---

## 🖼️ Demonstração Visual

### Screenshot — Incidentes

<img width="959" height="493" alt="image" src="https://github.com/user-attachments/assets/c1acd49d-0020-492b-8048-f505e96efc13" />

### Módulo de Interação

https://github.com/user-attachments/assets/a169044d-2fa0-40e1-bef5-6f0ffa9d215b

---

## 🔐 Segurança (v1.1)

> Esta seção documenta a principal mudança desta fork em relação ao projeto original.

### O problema original

No arquivo `assets/js/class.widget.js`, o código original exigia a inserção manual de um token de API do Zabbix e da URL do servidor **diretamente no JavaScript**:

```javascript
// INSEGURO — código original (não use)
this._apiAuthToken = 'Token API';
this._apiUrl = 'http://IP do SERVER API/api_jsonrpc.php';
```

Como arquivos `.js` são servidos diretamente ao navegador, qualquer pessoa com acesso ao dashboard (ou até à URL do arquivo) poderia recuperar essas credenciais via `F12 → Network` ou `F12 → Sources`, obtendo **acesso irrestrito à API do Zabbix**.

### A solução implementada

Toda a comunicação com a API do Zabbix foi movida para um **controlador PHP no backend** (`actions/WidgetRouteData.php`). O JavaScript agora chama apenas endpoints internos do Zabbix:

```javascript
// SEGURO — esta fork
const response = await fetch('zabbix.php?action=item_status&itemids[]=1234');
```

O PHP usa o framework interno do Zabbix (`CController`) que:
- Valida automaticamente a **sessão do usuário logado** via cookie de sessão
- Aplica as **permissões de leitura** do usuário nos hosts e itens consultados
- **Nunca expõe credenciais** ao cliente

Nenhum token precisa ser criado ou configurado manualmente.

---

## ⚙️ Recursos

| Recurso | Descrição |
|---|---|
| **GeoJSON de Rotas** | Exibição de enlaces de rede personalizados no mapa |
| **Status por Severidade** | Cor da rota atualizada automaticamente (verde = UP, vermelho = DOWN) |
| **Tráfego em tempo real** | In/Out em Gbps exibidos no popup da rota |
| **Card de Alertas** | Painel flutuante com hosts e rotas em problema |
| **Atualização automática** | Dados atualizados a cada 30 segundos |
| **Sem credenciais expostas** | Token e URL de API removidos do JavaScript |
| **Temas claro/escuro** | Compatível com a interface do Zabbix |
| **Interface interativa** | Responsiva, baseada em Leaflet.js + Zabbix PHP |

---

## 📦 Requisitos e Compatibilidade

| Componente | Versão mínima |
|---|---|
| Zabbix Server | 7.0 |
| PHP | 8.1+ |
| Leaflet.js | 1.9+ (já incluso no Zabbix 7.0) |

---

## 📥 Instalação

### 1. Clonar o módulo

```bash
cd /usr/share/zabbix/modules/
git clone https://github.com/Mateusrb6/GeoMaps-Zabbix.git geomap
```

### 2. Ajustar permissões

```bash
chown -R www-data:www-data /usr/share/zabbix/modules/geomap
```
> Substitua `www-data` pelo usuário do seu servidor web (`apache`, `nginx`, etc).

### 3. Ativar o módulo no Zabbix

1. Reinicie o serviço do PHP e do servidor web:
   ```bash
   systemctl restart php8.1-fpm nginx   # ou apache2
   ```
2. Acesse a interface web do Zabbix.
3. Vá em **Administração → Módulos** e clique em **Scan directory**.
4. Habilite o módulo **GeoMap**.
5. ⚠️ Desative o módulo nativo **GeoMaps** do Zabbix para evitar conflito.

### 4. Adicionar o widget ao dashboard

1. Vá em **Monitoramento → Dashboards**.
2. Edite um dashboard e clique em **Add widget**.
3. Selecione **GeoMap**.

---

## 🛠️ Configuração

### Coordenadas dos hosts

Para que os hosts apareçam no mapa, preencha o inventário de cada host no Zabbix:

1. Vá em **Configuração → Hosts** → selecione o host → aba **Inventário**.
2. Mude para `Manual` ou `Automático`.
3. Preencha **Location latitude** e **Location longitude** (ex: `-23.5505`, `-46.6333`).

### Arquivo de rotas GeoJSON

Adicione o seu arquivo de rotas no caminho:

```
/usr/share/zabbix/modules/geomap/assets/data/routes.geojson
```

O arquivo deve conter as rotas no formato GeoJSON. Cada feature pode incluir as seguintes propriedades para habilitar o status e o tráfego dinâmico:

| Propriedade | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome da rota exibido no popup |
| `itemid` | number | ID do item no Zabbix que indica o status da rota |
| `hostid` | number | ID do host para busca de tráfego |
| `key_traffic_in` | string | Chave do item de tráfego de entrada |
| `key_traffic_out` | string | Chave do item de tráfego de saída |

**Exemplo completo:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Rota 01 - Matriz → Filial A",
        "itemid": 12345,
        "hostid": 10101,
        "key_traffic_in": "net.if.in[eth0]",
        "key_traffic_out": "net.if.out[eth0]"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-46.633, -23.550],
          [-43.209, -22.903]
        ]
      }
    }
  ]
}
```

> 💡 Mantenha o nome do arquivo como `routes.geojson`, pois o módulo faz a leitura direta desse nome.

---

## ⚠️ Troubleshooting

| Sintoma | Solução |
|---|---|
| Mapa não aparece | Verifique permissões da pasta e cache do navegador (`Ctrl+Shift+R`) |
| Rotas não aparecem | Confirme o caminho e o formato do arquivo `routes.geojson` |
| Status das rotas não atualiza | Verifique se o `itemid` no GeoJSON corresponde a um item existente no Zabbix |
| Tráfego mostra "Indisponível" | Confirme se `hostid` e `key_traffic_in`/`key_traffic_out` estão corretos e se o usuário logado tem permissão de leitura nesses itens |
| Incidentes não aparecem no mapa | Verifique se os hosts têm triggers ativas e se o inventário com lat/lon está preenchido |
| Erro 403 ao carregar dados da rota | O usuário logado pode não ter permissão no grupo de hosts; verifique em **Administração → Grupos de usuários** |

---

## 👨‍💻 Autores

**Autor original**
Vinicius Sousa
- GitHub: [VSousa-7](https://github.com/VSousa-7)
- LinkedIn: [Vinícius Sousa](https://www.linkedin.com/in/vin%C3%ADcius-sousa-903ba6180/)
- E-mail: viniciussousati60@gmail.com

**Fork (correções de segurança)**
Mateus Reis
- GitHub: [Mateusrb6](https://github.com/Mateusrb6)

---

## 📄 Licença

Este projeto é distribuído sob a licença **GNU GPL v2**.
Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

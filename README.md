#🗺️ Zabbix Module – GeoMap




🌍 Visão geral

O GeoMap é um módulo desenvolvido com base no módulo GeoMaps nativo do Zabbix.
Ele oferece uma forma mais interativa e visual de exibir:

- Hosts monitorados diretamente no mapa,

- Rotas de rede (ex: enlaces de fibra óptica),

- Incidentes e alertas ativos, com destaque visual.

O objetivo é fornecer uma visão geográfica dinâmica da infraestrutura monitorada, facilitando a detecção e análise de falhas em tempo real.

⚙️ Recursos principais

✅ Exibição de rotas e enlaces personalizados em formato GeoJSON.
✅ Integração nativa com a API do Zabbix.
✅ Atualização em tempo real com base no status dos hosts e interfaces.
✅ Suporte a temas claro e escuro.
✅ Interface responsiva e interativa (Leaflet + JavaScript).

https://github.com/user-attachments/assets/49cc057f-71fd-4dc8-ac8a-0cf4df347bec

#Instalação

cd /usr/share/zabbix/modules/
git clone https://github.com/vinicius-sousa/zabbix-module-geomap.git

Depois:

Reinicie o Zabbix Frontend.

Acesse Administração → Módulos e habilite o “GeoMap Plus”.

Atualize o dashboard para visualizar o novo widget.


👨‍💻 Autor

Desenvolvido por Vinicius Sousa
📧 [Contato profissional opcional, se quiser colocar depois]

📄 Licença

Este projeto é distribuído sob a licença GNU GPL v2.
Veja o arquivo LICENSE
 para mais detalhes.

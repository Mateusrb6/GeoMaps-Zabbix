<?php

return [
    'unique_id' => $data['fields']['unique_id'], 
    'geomap' => [
        'config' => [
            'center' => [
                'latitude' => -23.5505,
                'longitude' => -46.6333,
                'zoom' => 5
            ],
            'tile_url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'max_zoom' => 18,
            'attribution' => '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            'severities' => [
                -1 => ['name' => 'OK', 'color' => '#00cc00', 'style' => 'ok'],
                0 => ['name' => 'Info', 'color' => '#0099ff', 'style' => 'info'],
                1 => ['name' => 'Warning', 'color' => '#ffcc00', 'style' => 'warning'],
                2 => ['name' => 'Average', 'color' => '#ff9900', 'style' => 'average'],
                3 => ['name' => 'High', 'color' => '#ff3300', 'style' => 'high'],
                4 => ['name' => 'Disaster', 'color' => '#cc0000', 'style' => 'disaster'],
                5 => ['name' => 'Critical', 'color' => '#660000', 'style' => 'critical']
            ]
        ],
        'hosts' => [
            'type' => 'FeatureCollection',
            'features' => [
                [
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [-46.6333, -23.5505]
                    ],
                    'properties' => [
                        'hostid' => 10101,
                        'name' => 'Router-SP',
                        'severity' => 0,
                        'problems' => []
                    ]
                ],
                [
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [-43.2096, -22.9035]
                    ],
                    'properties' => [
                        'hostid' => 10102,
                        'name' => 'Router-RJ',
                        'severity' => 1,
                        'problems' => [
                            1 => 2
                        ]
                    ]
                ]
            ]
        ]
    ]
];

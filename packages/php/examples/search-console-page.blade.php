@php
    $service = [
        'id' => 'gsc',
        'name' => 'Google Search Console',
        'scopes' => [['id' => 'webmasters.readonly', 'label' => 'Read search performance', 'required' => true]],
        'status' => 'connected',
        'connectedAs' => 'owner@nasaq.dev',
    ];
    $data = [
        'summary' => [
            'clicks' => ['value' => 9420, 'previous' => 8610, 'trend' => [300, 310, 320, 330, 340, 350]],
            'impressions' => ['value' => 214000, 'previous' => 198000, 'trend' => [7000, 7200, 7400, 7500, 7700, 7900]],
            'ctr' => ['value' => 0.044, 'previous' => 0.0435, 'trend' => [0.043, 0.0435, 0.044, 0.044, 0.0442, 0.044]],
            'position' => ['value' => 11.8, 'previous' => 12.6, 'trend' => [12.6, 12.4, 12.2, 12, 11.9, 11.8]],
        ],
        'series' => [
            ['date' => '2026-09-27', 'clicks' => 320, 'impressions' => 7300, 'ctr' => 0.0438, 'position' => 11.9],
            ['date' => '2026-09-28', 'clicks' => 340, 'impressions' => 7700, 'ctr' => 0.0442, 'position' => 11.8],
            ['date' => '2026-09-29', 'clicks' => 350, 'impressions' => 7900, 'ctr' => 0.0443, 'position' => 11.7],
        ],
        'previousSeries' => [
            ['date' => '2026-08-30', 'clicks' => 290, 'impressions' => 6900, 'ctr' => 0.042, 'position' => 12.7],
            ['date' => '2026-08-31', 'clicks' => 300, 'impressions' => 7000, 'ctr' => 0.0428, 'position' => 12.6],
            ['date' => '2026-09-01', 'clicks' => 305, 'impressions' => 7100, 'ctr' => 0.043, 'position' => 12.5],
        ],
        'queries' => [
            ['id' => 'q1', 'label' => 'nasaq design system', 'clicks' => 1820, 'impressions' => 22000, 'position' => 3.2, 'previousClicks' => 1500, 'previousPosition' => 3.9],
            ['id' => 'q2', 'label' => 'arabic rtl components', 'clicks' => 960, 'impressions' => 18000, 'position' => 6.8, 'previousClicks' => 1010, 'previousPosition' => 6.1],
        ],
        'pages' => [
            ['id' => 'p1', 'label' => 'https://nasaq.dev/', 'clicks' => 3100, 'impressions' => 41000, 'position' => 4.1, 'previousClicks' => 2800, 'previousPosition' => 4.4],
            ['id' => 'p2', 'label' => 'https://nasaq.dev/docs', 'clicks' => 1500, 'impressions' => 26000, 'position' => 7.3],
        ],
        'countries' => [
            ['code' => 'SA', 'value' => 4100, 'previous' => 3700],
            ['code' => 'EG', 'value' => 2300, 'previous' => 2400],
        ],
        'devices' => [
            ['id' => 'mobile', 'label' => 'Mobile', 'value' => 6100, 'previous' => 5500],
            ['id' => 'desktop', 'label' => 'Desktop', 'value' => 3100, 'previous' => 2900],
        ],
    ];
@endphp
<x-nq::search-console-page :service="$service" :data="$data" site="nasaq.dev" :period="28" />

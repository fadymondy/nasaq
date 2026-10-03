@php
    $service = [
        'id' => 'ga',
        'name' => 'Google Analytics',
        'scopes' => [['id' => 'analytics.readonly', 'label' => 'Read reports', 'required' => true]],
        'status' => 'connected',
        'connectedAs' => 'owner@nasaq.dev',
    ];
    $data = [
        'summary' => [
            'users' => ['value' => 18420, 'previous' => 16210, 'trend' => [510, 540, 560, 590, 620, 640]],
            'sessions' => ['value' => 26110, 'previous' => 24300, 'trend' => [820, 850, 900, 880, 930, 960]],
            'engagementRate' => ['value' => 0.612, 'previous' => 0.588, 'trend' => [0.58, 0.59, 0.6, 0.61, 0.61, 0.612]],
            'engagementSeconds' => ['value' => 134, 'previous' => 121, 'trend' => [118, 122, 126, 130, 132, 134]],
            'conversions' => ['value' => 940, 'previous' => 1010, 'trend' => [34, 33, 31, 30, 29, 30]],
        ],
        'series' => [
            ['date' => '2026-09-27', 'users' => 610, 'sessions' => 880, 'conversions' => 31],
            ['date' => '2026-09-28', 'users' => 640, 'sessions' => 930, 'conversions' => 29],
            ['date' => '2026-09-29', 'users' => 655, 'sessions' => 960, 'conversions' => 30],
        ],
        'previousSeries' => [
            ['date' => '2026-08-30', 'users' => 560, 'sessions' => 820, 'conversions' => 33],
            ['date' => '2026-08-31', 'users' => 575, 'sessions' => 850, 'conversions' => 34],
            ['date' => '2026-09-01', 'users' => 590, 'sessions' => 870, 'conversions' => 33],
        ],
        'realtime' => [
            'active' => 42,
            'perMinute' => [1, 2, 1, 3, 2, 4, 3, 2, 3, 5, 4, 3],
            'pages' => [['id' => 'p1', 'label' => '/', 'value' => 18], ['id' => 'p2', 'label' => '/pricing', 'value' => 9]],
            'countries' => [['code' => 'SA', 'value' => 21], ['code' => 'EG', 'value' => 11]],
        ],
        'channels' => [
            ['id' => 'organic', 'label' => 'Organic Search', 'value' => 12400, 'previous' => 11200],
            ['id' => 'direct', 'label' => 'Direct', 'value' => 6100, 'previous' => 6400],
            ['id' => 'social', 'label' => 'Organic Social', 'value' => 3200, 'previous' => 2700],
        ],
        'sourceMedium' => [
            ['id' => 'g', 'label' => 'google / organic', 'value' => 11800, 'previous' => 10900],
            ['id' => 'd', 'label' => '(direct) / (none)', 'value' => 6100, 'previous' => 6400],
        ],
        'pages' => [
            ['id' => 'home', 'label' => '/', 'value' => 9800, 'previous' => 9100],
            ['id' => 'pricing', 'label' => '/pricing', 'value' => 4300, 'previous' => 3900],
            ['id' => 'docs', 'label' => '/docs/getting-started', 'value' => 2900, 'previous' => 2500],
        ],
        'countries' => [
            ['code' => 'SA', 'value' => 8300, 'previous' => 7600],
            ['code' => 'EG', 'value' => 4100, 'previous' => 4200],
            ['code' => 'AE', 'value' => 2600, 'previous' => 2300],
        ],
        'devices' => [
            ['id' => 'mobile', 'label' => 'Mobile', 'value' => 11200, 'previous' => 10100],
            ['id' => 'desktop', 'label' => 'Desktop', 'value' => 6400, 'previous' => 6000],
        ],
        'daily' => [
            ['date' => '2026-09-27', 'count' => 880],
            ['date' => '2026-09-28', 'count' => 930],
            ['date' => '2026-09-29', 'count' => 960],
        ],
    ];
@endphp
<x-nq::google-analytics-page :service="$service" :data="$data" property="nasaq.dev" :range="['from' => '2026-09-01', 'to' => '2026-09-29']" :period="28" />

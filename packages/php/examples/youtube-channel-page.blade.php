@php
    $service = [
        'id' => 'yt',
        'name' => 'YouTube',
        'scopes' => [['id' => 'youtube.analytics.readonly', 'label' => 'Read channel analytics', 'required' => true]],
        'status' => 'connected',
        'connectedAs' => 'channel@nasaq.dev',
    ];
    $data = [
        'channel' => ['name' => 'Nasaq Studio', 'handle' => '@nasaq', 'subscribers' => 48200],
        'summary' => [
            'views' => ['value' => 128400, 'previous' => 112300, 'trend' => [3900, 4100, 4300, 4200, 4500, 4700]],
            'watchHours' => ['value' => 6240, 'previous' => 5810, 'trend' => [190, 200, 205, 210, 215, 220]],
            'subscribers' => ['value' => 840, 'previous' => 720, 'trend' => [25, 27, 28, 30, 29, 31]],
            'avgSeconds' => ['value' => 174, 'previous' => 160, 'trend' => [160, 165, 168, 170, 172, 174]],
        ],
        'series' => [
            ['date' => '2026-09-27', 'views' => 4300, 'watchHours' => 205, 'subscribers' => 28],
            ['date' => '2026-09-28', 'views' => 4500, 'watchHours' => 215, 'subscribers' => 29],
            ['date' => '2026-09-29', 'views' => 4700, 'watchHours' => 220, 'subscribers' => 31],
        ],
        'previousSeries' => [
            ['date' => '2026-08-30', 'views' => 3800, 'watchHours' => 185, 'subscribers' => 24],
            ['date' => '2026-08-31', 'views' => 3900, 'watchHours' => 190, 'subscribers' => 25],
            ['date' => '2026-09-01', 'views' => 4000, 'watchHours' => 195, 'subscribers' => 26],
        ],
        'videos' => [
            ['id' => 'v1', 'title' => 'Building an Arabic-first design system', 'views' => 24100, 'previousViews' => 19800, 'watchHours' => 1320, 'avgSeconds' => 312],
            ['id' => 'v2', 'title' => 'RTL layouts without the pain', 'views' => 18700, 'previousViews' => 18900, 'watchHours' => 940, 'avgSeconds' => 244],
        ],
        'trafficSources' => [
            ['id' => 'search', 'label' => 'YouTube search', 'value' => 52000, 'previous' => 46000],
            ['id' => 'suggested', 'label' => 'Suggested videos', 'value' => 41000, 'previous' => 36000],
        ],
        'countries' => [
            ['code' => 'SA', 'value' => 41000, 'previous' => 36500],
            ['code' => 'EG', 'value' => 29000, 'previous' => 27000],
        ],
    ];
@endphp
<x-nq::youtube-channel-page :service="$service" :data="$data" :period="28" />

@php
    $service = [
        'id' => 'crux',
        'name' => 'Chrome UX Report',
        'scopes' => [['id' => 'crux.read', 'label' => 'Read field data', 'required' => true]],
        'status' => 'connected',
        'connectedAs' => 'ops@nasaq.dev',
    ];
    $data = [
        'vitals' => [
            'LCP' => ['p75' => 2300, 'previous' => 2700, 'distribution' => ['good' => 0.78, 'needsImprovement' => 0.15, 'poor' => 0.07]],
            'INP' => ['p75' => 180, 'previous' => 210, 'distribution' => ['good' => 0.84, 'needsImprovement' => 0.11, 'poor' => 0.05]],
            'CLS' => ['p75' => 0.08, 'previous' => 0.12, 'distribution' => ['good' => 0.86, 'needsImprovement' => 0.09, 'poor' => 0.05]],
            'FCP' => ['p75' => 1600, 'previous' => 1750, 'distribution' => ['good' => 0.72, 'needsImprovement' => 0.2, 'poor' => 0.08]],
            'TTFB' => ['p75' => 700, 'previous' => 760, 'distribution' => ['good' => 0.8, 'needsImprovement' => 0.14, 'poor' => 0.06]],
        ],
        'series' => [
            ['date' => '2026-09-27', 'LCP' => 2500, 'INP' => 190, 'CLS' => 0.09, 'FCP' => 1700, 'TTFB' => 740],
            ['date' => '2026-09-28', 'LCP' => 2400, 'INP' => 185, 'CLS' => 0.085, 'FCP' => 1650, 'TTFB' => 720],
            ['date' => '2026-09-29', 'LCP' => 2300, 'INP' => 180, 'CLS' => 0.08, 'FCP' => 1600, 'TTFB' => 700],
        ],
        'pages' => [
            ['id' => 'p1', 'url' => '/', 'loads' => 48210, 'vitals' => ['LCP' => 2100, 'INP' => 150, 'CLS' => 0.05]],
            ['id' => 'p2', 'url' => '/pricing', 'loads' => 9120, 'vitals' => ['LCP' => 3400, 'INP' => 320, 'CLS' => 0.21]],
        ],
    ];
@endphp
<x-nq::web-vitals-page :service="$service" :data="$data" site="nasaq.dev" device="mobile" :period="28" refreshable />

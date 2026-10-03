@php
    $service = [
        'id' => 'apm',
        'name' => 'Nasaq APM',
        'scopes' => [['id' => 'apm.read', 'label' => 'Read traces and metrics', 'required' => true]],
        'status' => 'connected',
        'connectedAs' => 'ops@nasaq.dev',
    ];
    $data = [
        'summary' => [
            'requests' => ['value' => 184200, 'previous' => 171900, 'trend' => [30, 34, 31, 38, 41, 39]],
            'throughput' => ['value' => 512, 'previous' => 478, 'trend' => [440, 470, 455, 500, 520, 512]],
            'p95' => ['value' => 486, 'previous' => 540, 'trend' => [560, 540, 520, 500, 490, 486]],
            'errorRate' => ['value' => 0.0042, 'previous' => 0.0061, 'trend' => [0.007, 0.006, 0.005, 0.0045, 0.0043, 0.0042]],
        ],
        'latency' => [
            ['time' => '2026-09-29T07:00', 'p50' => 118, 'p95' => 470, 'p99' => 1050],
            ['time' => '2026-09-29T08:00', 'p50' => 124, 'p95' => 492, 'p99' => 1210],
            ['time' => '2026-09-29T09:00', 'p50' => 121, 'p95' => 486, 'p99' => 1140],
        ],
        'latencySummary' => ['p50' => 121, 'p95' => 486, 'p99' => 1140],
        'previousLatencySummary' => ['p50' => 130, 'p95' => 540, 'p99' => 1300],
        'errors' => [
            ['time' => '2026-09-29T07:00', 'requests' => 61000, 'errors' => 270],
            ['time' => '2026-09-29T08:00', 'requests' => 62400, 'errors' => 250],
            ['time' => '2026-09-29T09:00', 'requests' => 60800, 'errors' => 255],
        ],
        'previousErrorRate' => 0.0061,
        'topErrors' => [['id' => 'e1', 'message' => 'TimeoutError', 'count' => 14, 'endpoint' => 'POST /api/checkout', 'lastSeenAt' => '2026-09-29T08:40:00Z']],
        'throughput' => [
            ['date' => '2026-09-29T07:00', 'rpm' => 498],
            ['date' => '2026-09-29T08:00', 'rpm' => 520],
            ['date' => '2026-09-29T09:00', 'rpm' => 518],
        ],
        'previousThroughput' => [
            ['date' => '2026-09-28T07:00', 'rpm' => 470],
            ['date' => '2026-09-28T08:00', 'rpm' => 486],
            ['date' => '2026-09-28T09:00', 'rpm' => 479],
        ],
        'endpoints' => [
            ['id' => 'ep1', 'method' => 'GET', 'route' => '/api/orders/:id', 'requests' => 48210, 'p50' => 84, 'p95' => 410, 'errorRate' => 0.004],
            ['id' => 'ep2', 'method' => 'POST', 'route' => '/api/checkout', 'requests' => 9120, 'p50' => 380, 'p95' => 1640, 'errorRate' => 0.021],
        ],
        'traces' => [
            ['id' => 't1', 'method' => 'POST', 'name' => '/api/checkout', 'status' => 200, 'durationMs' => 1820, 'startedAt' => '2026-09-29T08:55:00Z', 'spans' => [
                ['id' => 's1', 'name' => 'POST /api/checkout', 'service' => 'api', 'startMs' => 0, 'durationMs' => 1820],
                ['id' => 's2', 'parentId' => 's1', 'name' => 'SELECT orders', 'service' => 'postgres', 'startMs' => 40, 'durationMs' => 310],
            ]],
            ['id' => 't2', 'method' => 'GET', 'name' => '/api/orders/:id', 'status' => 200, 'durationMs' => 96, 'startedAt' => '2026-09-29T08:58:00Z'],
        ],
    ];
@endphp
<x-nq::apm-page :service="$service" :data="$data" app="api.nasaq.dev" :target-ms="500" :slo="0.01" :period="6" refreshable endpoint-click error-click />

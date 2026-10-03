@php
    $runs = [
        [
            'id' => 'run_8f2a', 'name' => 'Nightly sync', 'status' => 'error', 'startedAt' => now()->startOfDay()->addHours(8)->addMinutes(40), 'durationMs' => 4200,
            'trigger' => 'Schedule', 'error' => 'Upstream returned 502',
            'steps' => [
                ['id' => 'fetch', 'name' => 'Fetch orders', 'status' => 'success', 'startedAtMs' => 0, 'durationMs' => 1200, 'output' => ['count' => 42]],
                ['id' => 'push', 'name' => 'Push to warehouse', 'status' => 'error', 'startedAtMs' => 1200, 'durationMs' => 3000, 'error' => 'Upstream returned 502', 'logs' => ['POST /v1/orders', '502 Bad Gateway']],
            ],
            'spans' => [
                ['id' => 's1', 'name' => 'sync', 'service' => 'worker', 'startMs' => 0, 'durationMs' => 4200],
                ['id' => 's2', 'parentId' => 's1', 'name' => 'POST /v1/orders', 'service' => 'http', 'startMs' => 1200, 'durationMs' => 3000, 'error' => true, 'attributes' => ['http.status' => 502]],
            ],
        ],
        [
            'id' => 'run_7c10', 'name' => 'Nightly sync', 'status' => 'success', 'startedAt' => now()->startOfDay()->subDay()->addHours(8)->addMinutes(40), 'durationMs' => 2100,
            'trigger' => 'Schedule',
            'steps' => [
                ['id' => 'fetch', 'name' => 'Fetch orders', 'status' => 'success', 'startedAtMs' => 0, 'durationMs' => 1100],
                ['id' => 'push', 'name' => 'Push to warehouse', 'status' => 'success', 'startedAtMs' => 1100, 'durationMs' => 1000],
            ],
        ],
    ];
@endphp
{{-- Your API call starts the run again; the button waits for it. Resolve { error: "…" } or reject to show why it failed. --}}
<x-nq::run-history :runs="$runs" retryable
    x-on:nq-run-retry="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))" />

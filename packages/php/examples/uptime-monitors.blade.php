@php
    $monitors = [
        ['id' => 'm1', 'name' => 'Storefront', 'target' => 'https://example.com', 'kind' => 'http', 'status' => 'up',
            'uptime' => ['24h' => 100, '7d' => 99.98, '30d' => 99.96], 'checks' => ['up', 'up', 'up', 'degraded', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
            'responseMs' => 182, 'lastCheckAt' => '2026-09-29T08:58:00Z', 'intervalSec' => 60],
        ['id' => 'm2', 'name' => 'Checkout API', 'target' => 'https://api.example.com/health', 'kind' => 'http', 'status' => 'down',
            'uptime' => ['24h' => 91.5, '7d' => 98.4, '30d' => 99.1], 'checks' => ['up', 'up', 'up', 'up', 'down', 'down', 'down', 'up', 'down', 'down', 'down', 'down'],
            'responseMs' => 2400, 'lastCheckAt' => '2026-09-29T08:59:00Z', 'intervalSec' => 60],
        ['id' => 'm3', 'name' => 'Mail server', 'target' => 'mail.example.com:25', 'kind' => 'tcp', 'status' => 'paused',
            'uptime' => ['24h' => null, '7d' => null, '30d' => 100], 'intervalSec' => 300],
    ];
    $incidents = [
        ['id' => 'i1', 'title' => 'Checkout API is failing', 'status' => 'investigating', 'impact' => 'major', 'startedAt' => '2026-09-29T08:20:00Z', 'services' => ['Checkout API'],
            'updates' => [
                ['at' => '2026-09-29T08:20:00Z', 'status' => 'investigating', 'body' => 'Checks are failing. We are looking into it.'],
                ['at' => '2026-09-29T08:45:00Z', 'status' => 'identified', 'body' => 'A bad deploy. Rolling it back.'],
            ]],
        ['id' => 'i2', 'title' => 'Slow product pages', 'status' => 'resolved', 'impact' => 'minor', 'startedAt' => '2026-09-28T06:00:00Z', 'resolvedAt' => '2026-09-28T07:00:00Z'],
    ];
@endphp
<div class="grid gap-6">
    <x-nq::uptime-monitors :monitors="$monitors" :incidents="$incidents"
        x-on:save="$event.detail.wait(Promise.resolve($event.detail.id ? undefined : { id: 'm4', status: 'up', uptime: { '30d': 100 } }))"
        x-on:delete="$event.detail.wait(Promise.resolve())"
        x-on:pause="$event.detail.wait(Promise.resolve())"
        x-on:resume="$event.detail.wait(Promise.resolve())"
        x-on:check="$event.detail.wait(Promise.resolve({ status: 'up', responseMs: 120 }))" />
    <div class="flex flex-wrap items-center gap-3">
        <x-nq::uptime-monitors.uptime-badge :percent="99.996" period="30d" />
        <x-nq::uptime-monitors.uptime-badge :percent="99.5" period="7d" />
        <x-nq::uptime-monitors.uptime-badge :percent="91.5" period="24h" />
        <x-nq::uptime-monitors.uptime-badge :percent="null" />
        <x-nq::uptime-monitors.uptime-bar :checks="['up', 'up', 'degraded', 'none', 'down']" class="w-40" />
    </div>
</div>

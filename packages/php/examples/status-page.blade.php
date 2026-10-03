@php
    $days = fn (array $bad = []) => collect(range(0, 89))->map(fn ($i) => $bad[$i] ?? 'up')->all();
    $services = [
        ['id' => 'web', 'name' => 'Website', 'description' => 'Storefront and checkout', 'status' => 'up', 'days' => $days([40 => 'degraded']), 'uptime' => 99.98],
        ['id' => 'api', 'name' => 'API', 'status' => 'degraded', 'days' => $days([70 => 'down', 71 => 'degraded', 89 => 'degraded']), 'uptime' => 99.41],
        ['id' => 'mail', 'name' => 'Email delivery', 'status' => 'up', 'days' => $days(), 'uptime' => 100],
    ];
    $incidents = [
        ['id' => 'i1', 'title' => 'Elevated API latency', 'status' => 'monitoring', 'impact' => 'minor', 'startedAt' => '2026-09-29T07:00:00Z', 'services' => ['API'],
            'updates' => [['at' => '2026-09-29T08:00:00Z', 'status' => 'monitoring', 'body' => 'A fix is out and we are watching the numbers.']]],
        ['id' => 'i2', 'title' => 'Checkout errors', 'status' => 'resolved', 'impact' => 'major', 'startedAt' => '2026-09-09T09:00:00Z', 'resolvedAt' => '2026-09-09T09:42:00Z'],
    ];
    $maintenance = [['id' => 'm1', 'title' => 'Database upgrade', 'description' => 'Read-only for about ten minutes.', 'startsAt' => '2026-10-02T09:00:00Z', 'endsAt' => '2026-10-02T10:00:00Z']];
@endphp
<x-nq::status-page title="Acme status" :services="$services" :incidents="$incidents" :maintenance="$maintenance" updated-at="2026-09-29T08:59:00Z">
    <x-slot:footer><a href="#subscribe" class="underline">Subscribe to updates</a></x-slot:footer>
</x-nq::status-page>

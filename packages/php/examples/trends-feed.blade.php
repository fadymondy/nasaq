@php
    $topics = [
        [
            'id' => 't1',
            'title' => 'Saudi tourism visas go digital',
            'summary' => 'A new e-visa flow cuts the wait to minutes.',
            'score' => 86,
            'reasons' => ['Mentioned by 6 outlets', 'Up 340% since yesterday'],
            'outlets' => [['id' => 'o1', 'name' => 'Asharq'], ['id' => 'o2', 'name' => 'Argaam']],
            'items' => [
                ['id' => 'i1', 'title' => 'New e-visa launches', 'outlet' => 'Asharq', 'url' => 'https://example.com/evisa', 'publishedAt' => now()->subHours(2)],
                ['id' => 'i2', 'title' => 'What the e-visa changes', 'outlet' => 'Argaam', 'publishedAt' => now()->subHour()],
            ],
            'detectedAt' => now()->subHours(3),
            'state' => 'new',
            'extraActions' => [['id' => 'share', 'label' => 'Share']],
        ],
        [
            'id' => 't2',
            'title' => 'Riyadh Metro adds two lines',
            'score' => 52,
            'outlets' => [['id' => 'o3', 'name' => 'SPA']],
            'items' => [['id' => 'i3', 'title' => 'Two new lines open', 'outlet' => 'SPA', 'publishedAt' => now()->subDay()]],
            'detectedAt' => now()->subDay(),
            'state' => 'new',
        ],
        [
            'id' => 't3',
            'title' => 'Fuel prices hold steady',
            'score' => 35,
            'outlets' => [],
            'items' => [],
            'detectedAt' => now()->subDays(3),
            'state' => 'saved',
        ],
    ];
    $sources = [
        ['id' => 's1', 'name' => 'Primary feed', 'url' => 'https://example.com/feed', 'tier' => 1, 'enabled' => true, 'health' => 'down', 'lastFetchedAt' => now()->subHours(6)],
        ['id' => 's2', 'name' => 'Backup feed', 'tier' => 2, 'enabled' => true, 'health' => 'degraded', 'lastFetchedAt' => now()->subMinutes(10), 'perDay' => 1200],
        ['id' => 's3', 'name' => 'Last resort', 'tier' => 3, 'enabled' => false, 'health' => 'ok'],
    ];
@endphp
<div class="flex flex-col gap-10" x-data
    x-on:nq-trend-action="$event.detail.waitUntil(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-source-toggle="$event.detail.waitUntil(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-source-retry="$event.detail.waitUntil(new Promise((resolve) => setTimeout(resolve, 400)))">
    <x-nq::trends-feed :topics="$topics" time-zone="Asia/Riyadh" />
    <x-nq::trends-feed.sources-catalogue :sources="$sources" />
</div>

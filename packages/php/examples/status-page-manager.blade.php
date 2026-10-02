@php
    $settings = [
        'title' => 'Nasaq status',
        'slug' => 'nasaq',
        'domain' => 'status.nasaq.dev',
        'services' => [
            ['id' => 'api', 'name' => 'API', 'visible' => true],
            ['id' => 'web', 'name' => 'Website', 'visible' => true],
            ['id' => 'db', 'name' => 'Database', 'visible' => false],
        ],
    ];
    $incidents = [[
        'id' => 'i1', 'title' => 'Elevated API latency', 'status' => 'monitoring', 'impact' => 'minor',
        'startedAt' => '2026-09-28T10:00:00Z', 'services' => ['API'],
        'updates' => [['at' => '2026-09-28T10:20:00Z', 'status' => 'monitoring', 'body' => 'A fix is rolled out. We are watching the numbers.']],
    ]];
@endphp
<x-nq::status-page-manager :settings="$settings" :incidents="$incidents" public-url="https://status.nasaq.dev" post-incident />

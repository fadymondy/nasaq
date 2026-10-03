@php
    $categories = [
        ['id' => 'tools', 'label' => 'Tools', 'icon' => 'wrench'],
        ['id' => 'data', 'label' => 'Data'],
    ];
    $permissionOptions = [
        ['id' => 'read', 'label' => 'Read your projects', 'description' => 'See project names and tasks.', 'risk' => 'low'],
        ['id' => 'write', 'label' => 'Change your projects', 'description' => 'Create and edit tasks.', 'risk' => 'medium'],
        ['id' => 'billing', 'label' => 'See billing', 'risk' => 'high'],
    ];
    $listings = [
        [
            'id' => 'runner', 'name' => 'Task runner', 'summary' => 'Run scripts on a schedule.',
            'description' => "Run scripts on a schedule.\n\nRetries failed runs and tells you when one breaks.",
            'category' => 'tools', 'publisher' => 'Nasaq', 'installs' => 12000, 'rating' => 4.7, 'ratingCount' => 210, 'version' => '1.4.0',
            'featured' => true, 'license' => 'MIT', 'permissions' => [$permissionOptions[0], $permissionOptions[1]],
            'changelog' => [['version' => '1.4.0', 'date' => '2026-09-01', 'notes' => ['Retries with backoff', 'Faster start']]],
            'reviews' => [['id' => 'r1', 'author' => 'Sara', 'rating' => 5, 'date' => '2026-09-20', 'body' => 'Does exactly what it says.']],
            'links' => [['label' => 'Documentation', 'href' => 'https://example.com/docs']],
            'tags' => ['cron', 'scripts'],
        ],
        ['id' => 'charts', 'name' => 'Charts Pro', 'summary' => 'Dashboards from your data.', 'category' => 'data', 'installs' => 9000, 'price' => ['amount' => 9, 'period' => 'month'], 'badge' => 'Official'],
        ['id' => 'csv', 'name' => 'CSV import', 'summary' => 'Bring spreadsheets in.', 'category' => 'data', 'installed' => true, 'installs' => 450],
    ];
    $templates = [['id' => 't1', 'name' => 'Weekly report', 'summary' => 'A report that sends itself.', 'category' => 'tools', 'icon' => 'layout-template', 'uses' => 3400]];
@endphp
<x-nq::marketplace :listings="$listings" :categories="$categories" :templates="$templates" :template-categories="$categories" :permission-options="$permissionOptions" publishable />

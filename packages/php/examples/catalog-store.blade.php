@php
    $categories = [
        ['id' => 'tools', 'label' => 'Tools', 'icon' => 'wrench'],
        ['id' => 'data', 'label' => 'Data', 'icon' => 'chart-bar'],
    ];
    $items = [
        ['id' => 'a', 'name' => 'Task runner', 'summary' => 'Run scripts on a schedule.', 'category' => 'tools', 'publisher' => 'Nasaq', 'installs' => 1200, 'rating' => 4.7, 'ratingCount' => 210, 'version' => '1.4.0'],
        ['id' => 'b', 'name' => 'Charts Pro', 'summary' => 'Dashboards from your data.', 'category' => 'data', 'installs' => 9000, 'price' => ['amount' => 9, 'period' => 'month'], 'badge' => 'Official'],
        ['id' => 'c', 'name' => 'CSV import', 'summary' => 'Bring spreadsheets in.', 'category' => 'data', 'installed' => true, 'installs' => 450],
    ];
@endphp
<x-nq::catalog-store :items="$items" :categories="$categories" />

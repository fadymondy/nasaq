@php
    $servers = [
        ['id' => 's1', 'name' => 'web-1', 'plan' => 'CPX31', 'region' => 'fsn1', 'monthlyPrice' => 15.4, 'usage' => ['cpu' => 12, 'memory' => 18, 'disk' => 40], 'smallerPlan' => ['name' => 'CPX21', 'monthlyPrice' => 8.5]],
        ['id' => 's2', 'name' => 'db-1', 'plan' => 'CPX41', 'region' => 'fsn1', 'monthlyPrice' => 28, 'usage' => ['cpu' => 91, 'memory' => 72, 'disk' => 60], 'largerPlan' => ['name' => 'CPX51', 'monthlyPrice' => 55]],
        ['id' => 's3', 'name' => 'worker-1', 'plan' => 'CPX21', 'region' => 'nbg1', 'monthlyPrice' => 8.5, 'usage' => ['cpu' => 45, 'memory' => 50, 'disk' => 30]],
    ];
    $items = [
        ['id' => 'i1', 'name' => 'Domain renewal', 'category' => 'Domains', 'amount' => 24, 'period' => 'yearly'],
        ['id' => 'i2', 'name' => 'Backups', 'category' => 'Storage', 'amount' => 6, 'period' => 'monthly'],
    ];
    $history = [];
    for ($i = 0; $i < 14; $i++) {
        $history[] = ['date' => date('Y-m-d', strtotime('2026-09-15 +'.$i.' days')), 'cost' => 2 + ($i % 5) * 0.3];
    }
@endphp
<x-nq::finops-cost :servers="$servers" :items="$items" :previous-total="70" :budget="80" :history="$history"
    x-on:add-item="$event.detail.wait(Promise.resolve())"
    x-on:remove-item="$event.detail.wait(Promise.resolve())"
    x-on:change-plan="$event.detail.wait(Promise.resolve())" />

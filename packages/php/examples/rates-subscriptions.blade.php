@php
    $rates = [
        ['id' => 'r1', 'amount' => 7500, 'from' => '2026-01-01'],
        ['id' => 'r2', 'amount' => 9000, 'from' => '2026-07-01'],
    ];
    $subs = [
        ['id' => 's1', 'name' => 'Hosting', 'projectId' => 'p1', 'projectName' => 'Storefront', 'amount' => 2500, 'quantity' => 2, 'schedule' => ['kind' => 'cycle', 'every' => 1, 'unit' => 'month'], 'anchor' => '2026-09-01', 'status' => 'active'],
        ['id' => 's2', 'name' => 'Support plan', 'amount' => 12000, 'schedule' => ['kind' => 'cycle', 'every' => 1, 'unit' => 'year'], 'anchor' => '2026-03-15', 'status' => 'paused'],
    ];
    $projects = [['id' => 'p1', 'name' => 'Storefront'], ['id' => 'p2', 'name' => 'Marketing site']];
@endphp
<div class="flex flex-col gap-6">
    <x-nq::rates-subscriptions.rate-schedule :rates="$rates" currency="USD" today="2026-09-29" can-add can-remove />
    <x-nq::rates-subscriptions.recurring-subscriptions :subscriptions="$subs" :projects="$projects" currency="USD" today="2026-09-29" can-save can-change-status />
    <x-nq::rates-subscriptions.billing-overview :subscriptions="$subs" currency="USD" today="2026-09-29" />
</div>

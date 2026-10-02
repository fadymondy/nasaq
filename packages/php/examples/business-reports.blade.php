@php
    $rows = [
        ['id' => 'p1', 'name' => 'Website rebuild', 'revenue' => 120000, 'cost' => 78000, 'hours' => 410, 'marginTrend' => [0.3, 0.33, 0.35]],
        ['id' => 'p2', 'name' => 'Mobile app', 'revenue' => 90000, 'cost' => 96000, 'hours' => 520, 'marginTrend' => [0.05, -0.02, -0.07]],
    ];
    $stages = [
        ['id' => 'lead', 'label' => 'Leads', 'count' => 240, 'value' => 960000],
        ['id' => 'proposal', 'label' => 'Proposal', 'count' => 80, 'value' => 640000],
        ['id' => 'won', 'label' => 'Won', 'count' => 24, 'value' => 210000, 'won' => true],
    ];
    $employees = [['id' => 'e1', 'name' => 'Sara', 'role' => 'Designer', 'target' => 140, 'actual' => 152, 'trend' => [120, 135, 152], 'delta' => 0.08]];
    $volume = [
        ['date' => '2026-09-27', 'created' => 31, 'resolved' => 28],
        ['date' => '2026-09-28', 'created' => 27, 'resolved' => 30],
        ['date' => '2026-09-29', 'created' => 35, 'resolved' => 29],
    ];
@endphp
<div class="flex flex-col gap-8">
    <x-nq::business-reports.profitability-report :format="['currency' => 'USD', 'maxFraction' => 0]" :rows="$rows"
        :row-actions="[['id' => 'open', 'label' => 'Open project', 'icon' => 'external-link']]" />
    <x-nq::business-reports.pipeline-report view="table" :format="['currency' => 'USD', 'compact' => true]" :stages="$stages"
        :stage-actions="[['id' => 'open', 'label' => 'Open stage', 'icon' => 'external-link']]" />
    <x-nq::business-reports.employee-kpi-dashboard measure="Billable hours" :employees="$employees"
        :actions="[['id' => 'open', 'label' => 'Open profile', 'icon' => 'user']]" />
    <x-nq::business-reports.support-stats-report
        :summary="['open' => 42, 'firstResponseMinutes' => 38, 'resolutionMinutes' => 310, 'csat' => 0.92, 'slaRate' => 0.87]"
        :volume="$volume"
        :by-status="[['id' => 'open', 'label' => 'Open', 'value' => 42], ['id' => 'pending', 'label' => 'Pending', 'value' => 18], ['id' => 'solved', 'label' => 'Solved', 'value' => 120]]"
        :agents="[['id' => 'a1', 'name' => 'Omar', 'assigned' => 60, 'resolved' => 52, 'firstResponseMinutes' => 25, 'csat' => 0.94, 'trend' => [8, 11, 14]], ['id' => 'a2', 'name' => 'Lina', 'assigned' => 48, 'resolved' => 40, 'firstResponseMinutes' => 140, 'csat' => 0.9]]" />
</div>

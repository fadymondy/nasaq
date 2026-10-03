@php
    $fields = [
        ['id' => 'status', 'kind' => 'multi', 'label' => 'Status', 'options' => [['value' => 'open', 'label' => 'Open'], ['value' => 'won', 'label' => 'Won'], ['value' => 'lost', 'label' => 'Lost']]],
        ['id' => 'owner', 'kind' => 'select', 'label' => 'Owner', 'options' => [['value' => 'sara', 'label' => 'Sara'], ['value' => 'omar', 'label' => 'Omar']]],
        ['id' => 'stage', 'kind' => 'toggle', 'label' => 'Stage', 'options' => [['value' => 'new', 'label' => 'New'], ['value' => 'late', 'label' => 'Late']]],
    ];
    $doc = ['title' => 'Deals report', 'sections' => [['heading' => 'Totals', 'table' => ['columns' => ['Owner', 'Won'], 'rows' => [['Sara', 12], ['Omar', 9]]]]]];
    $views = [['id' => 'weekly', 'name' => 'Weekly review', 'query' => 'range=7d&status=open'], ['id' => 'mine', 'name' => 'Sara won', 'query' => 'owner=sara&status=won', 'shared' => true]];
@endphp
<div x-data="{ filters: { range: { kind: 'relative', preset: '30d' }, comparison: 'none', fields: { status: ['open'], owner: [], stage: [] } } }" class="flex max-w-3xl flex-col gap-4">
    <x-nq::report-sheet title="Deals report" subtitle="All pipelines" generated-at="2026-09-29T09:00:00Z" time-zone="Asia/Riyadh" :filters="[['label' => 'Owner', 'value' => 'Everyone']]">
        <x-slot:toolbar>
            <x-nq::report-export-menu :document="$doc" filename="deals" />
        </x-slot:toolbar>
        <x-nq::report-filter-bar x-model="filters" :fields="$fields" :state="['range' => ['kind' => 'relative', 'preset' => '30d'], 'comparison' => 'none', 'fields' => ['status' => ['open'], 'owner' => [], 'stage' => []]]" comparison :range="['time-zone' => 'Asia/Riyadh', 'now' => '2026-09-29T09:00:00Z']" />
        <x-nq::saved-report-views x-model="filters" :views="$views" :fields="$fields" can-rename can-update can-share can-delete />
    </x-nq::report-sheet>
</div>

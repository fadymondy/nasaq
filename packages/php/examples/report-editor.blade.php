@php
    $saved = [
        'title' => 'May summary',
        'subtitle' => 'Orders and delivery',
        'author' => 'Sara',
        'date' => '2026-05-31',
        'blocks' => [
            ['id' => 'h1', 'type' => 'heading', 'text' => 'Highlights', 'level' => 1],
            ['id' => 't1', 'type' => 'text', 'html' => '<p>Orders grew <strong>12%</strong>.</p><script>alert(1)</script>'],
            ['id' => 'm1', 'type' => 'metrics', 'items' => [['id' => 'f1', 'label' => 'Revenue', 'value' => 12400, 'delta' => 0.124, 'currency' => 'USD', 'deltaLabel' => 'vs April'], ['id' => 'f2', 'label' => 'Orders', 'value' => 320]]],
            ['id' => 'h2', 'type' => 'heading', 'text' => 'Trend', 'level' => 2],
            ['id' => 'c1', 'type' => 'chart', 'title' => 'Orders by week', 'kind' => 'bar', 'series' => ['Orders'], 'rows' => [['label' => 'W1', 'values' => [60]], ['label' => 'W2', 'values' => [80]]], 'caption' => 'Weekly'],
            ['id' => 'tb', 'type' => 'table', 'title' => 'Top items', 'columns' => ['Item', 'Sold'], 'rows' => [['Tea', '40'], ['Coffee', '31']]],
            ['id' => 'co', 'type' => 'callout', 'tone' => 'warning', 'title' => 'Note', 'text' => 'Stock is low.'],
            ['id' => 'dv', 'type' => 'divider'],
        ],
    ];
@endphp
<div class="flex flex-col gap-8">
    <x-nq::report-editor :report="['title' => 'May summary', 'blocks' => []]" can-save />
    <x-nq::report-editor.viewer :report="$saved" />
</div>

@include('nasaq::components.artifact-renderer._logic')
@php
    $table = [
        'kind' => 'table',
        'title' => 'Overdue invoices',
        'columns' => [['key' => 'n', 'label' => 'No.'], ['key' => 'amt', 'label' => 'Amount', 'align' => 'end']],
        'rows' => [['n' => 'INV-1', 'amt' => 1200], ['n' => 'INV-2', 'amt' => 480]],
    ];
    $card = [
        'kind' => 'card',
        'id' => 'order-42',
        'title' => 'Order #42',
        'badges' => [['label' => 'Paid', 'tone' => 'success']],
        'fields' => [['label' => 'Customer', 'value' => 'Lina'], ['label' => 'Total', 'value' => 129.5]],
        'footer' => 'Source: billing',
        'actions' => [
            ['id' => 'refund', 'label' => 'Refund', 'variant' => 'danger', 'confirm' => 'Refund this order?'],
            ['id' => 'receipt', 'label' => 'Send receipt'],
        ],
    ];
    $chart = [
        'kind' => 'chart',
        'title' => 'Weekly revenue',
        'chart' => 'bar',
        'xKey' => 'day',
        'series' => [['key' => 'rev', 'label' => 'Revenue']],
        'data' => [['day' => 'Mon', 'rev' => 120], ['day' => 'Tue', 'rev' => 180], ['day' => 'Wed', 'rev' => 90]],
    ];
    $answer = <<<'TXT'
Here is the picture for this week.

```artifact
{ "kind": "stats", "items": [{ "label": "Revenue", "value": 48210, "delta": 0.124 }, { "label": "Open tickets", "value": 12, "delta": -0.08, "invert": true, "tone": "warning" }] }
```

```artifact
{ "kind": "picker", "id": "audience", "title": "Send a reminder to", "options": [{ "value": "all", "label": "All customers" }, { "value": "late", "label": "Late payers", "description": "More than 30 days" }] }
```
TXT;
    $extracted = nq_art_extract($answer);
@endphp
<div class="flex max-w-xl flex-col gap-4" x-data="{ picked: '', acted: '' }" x-on:nq-artifact-pick="picked = $event.detail.values.join(', ')" x-on:nq-artifact-action="acted = $event.detail.id">
    <x-nq::artifact-renderer :artifact="$table" />
    <x-nq::artifact-renderer :artifact="$card" />
    <x-nq::artifact-renderer :artifact="$chart" />
    <x-nq::markdown :source="$extracted['text']" />
    <x-nq::artifact-renderer.list :artifacts="$extracted['artifacts']" />
    <p x-show="picked" style="display: none" class="text-caption text-muted-foreground">Picked: <span x-text="picked"></span></p>
    <p x-show="acted" style="display: none" class="text-caption text-muted-foreground">Action: <span x-text="acted"></span></p>
</div>

@php
    $widgets = [
        ['type' => 'revenue', 'title' => 'Revenue', 'description' => 'Revenue this month', 'defaultCols' => 2, 'defaultSettings' => ['range' => '30d'], 'fields' => [['key' => 'range', 'label' => 'Range', 'type' => 'select', 'options' => [['value' => '7d', 'label' => '7 days'], ['value' => '30d', 'label' => '30 days']]]]],
        ['type' => 'orders', 'title' => 'Orders', 'description' => 'Orders in the queue'],
        ['type' => 'notes', 'title' => 'Notes', 'unique' => true],
    ];
    $default = [
        ['id' => 'revenue-1', 'type' => 'revenue', 'cols' => 2, 'rows' => 1],
        ['id' => 'orders-1', 'type' => 'orders', 'cols' => 1, 'rows' => 1],
    ];
@endphp
<x-nq::dashboard-board title="Overview" :widgets="$widgets" :layout="$default" :default-layout="$default">
    <x-nq::dashboard-board.widget type="revenue">
        <p class="text-h2 font-semibold" x-text="setting(card, 'range') === '7d' ? '$12,400' : '$48,200'"></p>
    </x-nq::dashboard-board.widget>
    <x-nq::dashboard-board.widget type="orders"><p class="text-h2 font-semibold">318</p></x-nq::dashboard-board.widget>
    <x-nq::dashboard-board.widget type="notes"><p class="text-body-sm">Ship the Q4 report on Monday.</p></x-nq::dashboard-board.widget>
</x-nq::dashboard-board>

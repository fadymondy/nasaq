@php
    $value = [
        'columns' => [
            ['id' => 'name', 'label' => 'Name', 'type' => 'text', 'required' => true],
            ['id' => 'price', 'label' => 'Price', 'type' => 'number'],
            ['id' => 'status', 'label' => 'Status', 'type' => 'select', 'options' => [['value' => 'live', 'label' => 'Live', 'hue' => 'green'], ['value' => 'draft', 'label' => 'Draft', 'hue' => 'amber']]],
            ['id' => 'active', 'label' => 'Active', 'type' => 'checkbox', 'width' => 120],
        ],
        'rows' => [
            ['id' => 'r1', 'cells' => ['name' => 'Coffee', 'price' => 12, 'status' => 'live', 'active' => true]],
            ['id' => 'r2', 'cells' => ['name' => 'Tea', 'price' => 8, 'status' => 'draft', 'active' => false]],
        ],
    ];
@endphp
<div x-on:nq-content-save="setTimeout(() => $event.detail.done(), 400)">
    <x-nq::content-table-editor :value="$value" has-save class="w-[44rem]" />
</div>

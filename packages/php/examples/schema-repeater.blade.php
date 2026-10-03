@php
    $fields = [
        ['key' => 'name', 'type' => 'text', 'label' => 'Name', 'required' => true, 'maxLength' => 40],
        ['key' => 'kind', 'type' => 'select', 'label' => 'Kind', 'options' => [['value' => 'phone', 'label' => 'Phone'], ['value' => 'email', 'label' => 'Email']], 'width' => 'half'],
        ['key' => 'qty', 'type' => 'number', 'label' => 'Quantity', 'integer' => true, 'min' => 1, 'max' => 99, 'unit' => 'pcs', 'width' => 'half'],
        ['key' => 'active', 'type' => 'switch', 'label' => 'Active'],
    ];
@endphp
<x-nq::schema-repeater :fields="$fields" :rows="[['name' => 'Sara', 'kind' => 'phone', 'qty' => 2, 'active' => true]]" :min="1" :max="5" title-key="name" label="Contacts" class="w-[34rem]" />

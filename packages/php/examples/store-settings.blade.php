@php
    $zones = [
        ['id' => 'z1', 'name' => 'Cairo and Giza', 'countries' => ['EG'], 'cities' => ['Cairo', 'Giza'], 'rates' => [
            ['id' => 'r1', 'label' => 'Standard', 'type' => 'flat', 'amount' => 5000, 'etaDays' => [2, 3], 'active' => true],
            ['id' => 'r2', 'label' => 'Express', 'type' => 'flat', 'amount' => 12000, 'etaDays' => [1, 1], 'express' => true, 'active' => true],
        ]],
        ['id' => 'z2', 'name' => 'Rest of the world', 'countries' => ['*'], 'rates' => [
            ['id' => 'r3', 'label' => 'International', 'type' => 'free-over', 'freeOver' => 200000, 'amount' => 25000, 'active' => true],
        ]],
    ];
    $pickups = [['id' => 'p1', 'name' => 'Maadi store', 'address' => '12 Road 9, Maadi', 'country' => 'EG', 'city' => 'Cairo', 'readyInHours' => 2, 'active' => true]];
    $taxes = [
        ['id' => 't1', 'name' => 'VAT', 'country' => 'EG', 'bps' => 1400, 'inclusive' => true, 'onShipping' => true, 'active' => true],
        ['id' => 't2', 'name' => 'Sales tax', 'country' => 'US', 'region' => 'CA', 'bps' => 725, 'inclusive' => false, 'active' => true],
    ];
    $discounts = [
        ['id' => 'd1', 'title' => 'Summer 10', 'method' => 'code', 'code' => 'SUMMER10', 'kind' => 'percentage', 'value' => 1000, 'active' => true, 'combinesWith' => []],
        ['id' => 'd2', 'title' => 'Free shipping over 500', 'method' => 'automatic', 'kind' => 'free-shipping', 'minSubtotal' => 50000, 'active' => true, 'combinesWith' => []],
    ];
    $products = [
        ['id' => 'pr1', 'name' => 'Linen shirt', 'images' => [], 'options' => [], 'variants' => [['id' => 'v1', 'options' => [], 'price' => 25000]]],
        ['id' => 'pr2', 'name' => 'Canvas tote', 'images' => [], 'options' => [], 'variants' => [['id' => 'v2', 'options' => [], 'price' => 12000]]],
    ];
    $card = [
        'id' => 'gc1', 'code' => 'SEEDDEMOCARD0001', 'currency' => 'USD', 'expiresAt' => null, 'disabled' => false,
        'ledger' => [['id' => 'gc1-e1', 'kind' => 'issue', 'amount' => 50000, 'at' => '2026-09-01T09:00:00.000Z']],
    ];
    $now = '2026-09-29T09:00:00';
@endphp
<div class="grid gap-10">
    <x-nq::store-settings.shipping-settings :zones="$zones" :pickups="$pickups" currency="USD" can-delete-zone can-save-pickup can-delete-pickup />
    <x-nq::store-settings.tax-settings :rates="$taxes" currency="USD" can-delete />
    <x-nq::store-settings.discounts-manager :discounts="$discounts" :products="$products" :usage="['d1' => 12]" :now="$now" currency="USD" can-delete />
    <x-nq::store-settings.gift-cards-manager :cards="[$card]" :now="$now" currency="USD" />
    <x-nq::store-settings.gift-card-field :cards="[]" :known="[$card]" :total="30000" :now="$now" currency="USD" />
</div>

@php
    // The README Quick start: lines, shipping methods, a saved address and a payment policy (card, cash on delivery, wallet).
    // Prices are minor units (cents). Listen for "nq-store-checkout-place" to send the order; with no listener the order number is #1001.
    $lines = [
        ['id' => 'tee-black-m', 'productId' => 'tee', 'variantId' => 'black-m', 'name' => 'Everyday cotton tee', 'variantLabel' => 'Black / M', 'unitPrice' => 2900, 'compareAt' => 3900, 'quantity' => 2],
        ['id' => 'bottle', 'productId' => 'bottle', 'variantId' => 'bottle-1', 'name' => 'Steel water bottle', 'variantLabel' => '750 ml', 'unitPrice' => 2400, 'quantity' => 1],
    ];
    $methods = [
        ['id' => 'standard', 'label' => 'Standard delivery', 'price' => 500, 'freeOver' => 15000, 'etaDays' => [3, 5]],
        ['id' => 'express', 'label' => 'Express delivery', 'price' => 1500, 'etaDays' => [1, 2]],
    ];
    $addresses = [
        ['id' => 'home', 'name' => 'Mona Adel', 'phone' => '+20 100 123 4567', 'line1' => '12 Nile Street', 'city' => 'Cairo', 'region' => '', 'postalCode' => '11728', 'country' => 'EG', 'isDefault' => true],
    ];
@endphp
<x-nq::store-checkout :lines="$lines" currency="USD" :shipping-methods="$methods" :saved-addresses="$addresses" :weekend="[5, 6]" now="2026-09-29T09:00:00Z"
    :payment-policy="['card' => true, 'cod' => ['maxTotal' => 500000, 'countries' => ['EG'], 'fee' => 250], 'wallet' => ['balance' => 4000]]"
    can-edit-cart can-track-order can-continue-shopping />

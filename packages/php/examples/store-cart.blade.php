@php
    // The README Quick start: a mini cart (the drawer, opened by the cart button) and the cart page share one cart. Prices are minor units (cents).
    $lines = [
        ['id' => 'tee-black-m', 'productId' => 'tee', 'variantId' => 'black-m', 'name' => 'Everyday cotton tee', 'variantLabel' => 'Black / M', 'unitPrice' => 2900, 'compareAt' => 3900, 'quantity' => 2, 'maxQuantity' => 3],
        ['id' => 'bottle', 'productId' => 'bottle', 'variantId' => 'bottle-1', 'name' => 'Steel water bottle', 'variantLabel' => '750 ml', 'unitPrice' => 2400, 'quantity' => 1, 'maxQuantity' => 12],
    ];
    $zones = [
        ['id' => 'cairo', 'label' => 'Greater Cairo', 'cities' => ['Cairo', 'Giza'], 'methods' => [
            ['id' => 'standard', 'label' => 'Standard', 'price' => 500, 'freeOver' => 15000, 'etaDays' => [2, 4]],
            ['id' => 'express', 'label' => 'Express', 'price' => 1200, 'etaDays' => [0, 1]],
        ]],
    ];
    $products = [
        ['id' => 'cap', 'name' => 'Canvas cap', 'category' => 'Accessories', 'images' => [['src' => 'https://picsum.photos/seed/cap/640/480', 'alt' => 'Canvas cap']], 'options' => [],
            'variants' => [['id' => 'cap-1', 'options' => [], 'price' => 1900, 'stock' => 10]]],
        ['id' => 'socks', 'name' => 'Wool socks', 'category' => 'Accessories', 'images' => [['src' => 'https://picsum.photos/seed/socks/640/480']], 'options' => [],
            'variants' => [['id' => 'socks-1', 'options' => [], 'price' => 1200, 'stock' => 0]]],
    ];
@endphp
<div class="flex flex-col gap-6" x-on:store-cart-checkout="console.log('go to checkout', $event.detail.lines)">
    <x-nq::store-cart.mini-cart :lines="$lines" currency="USD" :free-shipping-threshold="15000">
        <x-slot:trigger><x-nq::store-cart.button :count="3" /></x-slot:trigger>
    </x-nq::store-cart.mini-cart>
    <x-nq::store-cart :lines="$lines" currency="USD" :free-shipping-threshold="15000" :zones="$zones">
        <x-slot:cross-sell><x-nq::store-cart.cross-sell :products="$products" currency="USD" /></x-slot:cross-sell>
    </x-nq::store-cart>
</div>

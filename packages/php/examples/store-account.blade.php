@php
    $line = fn ($id, $name, $price, $qty, $extra = []) => array_merge(['id' => $id, 'productId' => 'p-'.$id, 'variantId' => 'v-'.$id, 'name' => $name, 'unitPrice' => $price, 'quantity' => $qty], $extra);
    $delivered = [
        'id' => 'o1', 'number' => '#1040', 'placedAt' => '2026-09-20T10:00:00Z', 'status' => 'delivered', 'payment' => 'paid',
        'customer' => ['name' => 'Sara Ali'],
        'lines' => [$line('a', 'Coffee beans 250g', 1800, 2, ['fulfilled' => 2]), $line('b', 'Paper filters', 600, 1, ['fulfilled' => 1])],
        'shippingAddress' => ['name' => 'Sara Ali', 'line1' => '12 Olaya St', 'city' => 'Riyadh', 'country' => 'SA', 'phone' => '+966 50 123 4567'],
        'totals' => ['subtotal' => 4200, 'discount' => 0, 'shipping' => 500, 'tax' => 0, 'total' => 4700, 'itemCount' => 3, 'savings' => 0],
        'events' => [
            ['at' => '2026-09-20T10:00:00Z', 'kind' => 'placed', 'label' => 'Order placed'],
            ['at' => '2026-09-22T09:00:00Z', 'kind' => 'shipped', 'label' => 'Shipped'],
            ['at' => '2026-09-25T10:00:00Z', 'kind' => 'delivered', 'label' => 'Delivered'],
        ],
        'tracking' => ['carrier' => 'Aramex', 'number' => 'AB123'],
    ];
    $shipped = [
        'id' => 'o2', 'number' => '#1044', 'placedAt' => '2026-09-27T08:00:00Z', 'status' => 'shipped', 'payment' => 'paid',
        'customer' => ['name' => 'Sara Ali'],
        'lines' => [$line('c', 'Ceramic mug', 1500, 1)],
        'totals' => ['subtotal' => 1500, 'discount' => 0, 'shipping' => 0, 'tax' => 0, 'total' => 1500, 'itemCount' => 1, 'savings' => 0],
        'events' => [['at' => '2026-09-27T08:00:00Z', 'kind' => 'placed', 'label' => 'Order placed']],
        'tracking' => ['carrier' => 'Aramex', 'number' => 'ZX900'],
    ];
    $orders = [$delivered, $shipped];
    $product = fn ($id, $name, $price, $stock = null, $extra = []) => array_merge(['id' => 'p-'.$id, 'name' => $name, 'images' => [], 'options' => [], 'variants' => [['id' => 'v-'.$id, 'options' => [], 'price' => $price] + ($stock === null ? [] : ['stock' => $stock])]], $extra);
    $catalogue = [$product('a', 'Coffee beans 250g', 1900, 12), $product('b', 'Paper filters', 600, 0), $product('c', 'Ceramic mug', 1500, 4), $product('d', 'Pour-over kettle', 5400, 2), $product('e', 'Retired grinder', 9000, 3, ['status' => 'archived'])];
    $requests = [[
        'id' => 'r1', 'number' => 'RMA-1001', 'orderId' => 'o1', 'createdAt' => '2026-09-26T10:00:00Z', 'status' => 'approved',
        'lines' => [['lineId' => 'b', 'quantity' => 1]], 'reason' => 'defective', 'refundMethod' => 'original', 'refundAmount' => 600,
    ]];
    $saved = [
        ['id' => 'w1', 'productId' => 'p-a', 'variantId' => 'v-a', 'addedAt' => '2026-09-01T10:00:00Z', 'priceWhenSaved' => 2200],
        ['id' => 'w2', 'productId' => 'p-b', 'variantId' => 'v-b', 'addedAt' => '2026-09-02T10:00:00Z'],
        ['id' => 'w3', 'productId' => 'p-d', 'variantId' => 'v-d', 'addedAt' => '2026-09-03T10:00:00Z'],
    ];
    $book = [
        ['id' => 'home', 'name' => 'Sara Ali', 'phone' => '+966 50 123 4567', 'line1' => '12 Olaya St', 'city' => 'Riyadh', 'postalCode' => '12211', 'country' => 'SA', 'isDefault' => true],
        ['id' => 'work', 'name' => 'Sara Ali', 'phone' => '+966 50 765 4321', 'line1' => '45 King Fahd Rd', 'city' => 'Jeddah', 'country' => 'SA'],
    ];
@endphp
<div class="flex flex-col gap-12">
    <x-nq::store-account title="{{ \Nasaq\Nasaq::t('My account', 'حسابي') }}">
        <x-slot:nav><x-nq::store-account.nav active="orders" :counts="['wishlist' => 3]" /></x-slot:nav>
        <x-nq::store-account.order-history :orders="$orders" :products="$catalogue" currency="USD" tracking-template="https://track.example.com/?n={number}" />
    </x-nq::store-account>
    <x-nq::store-account.order :order="$delivered" :requests="$requests" :products="$catalogue" currency="USD" can-back now="2026-09-29T09:00:00Z" tracking-template="https://track.example.com/?n={number}" />
    <x-nq::store-account.return-request :order="$delivered" :requests="$requests" currency="USD" can-back now="2026-09-29T09:00:00Z" />
    <x-nq::store-account.return-status :request="$requests[0]" :order="$delivered" currency="USD" can-cancel />
    <x-nq::store-account.wishlist :items="$saved" :products="$catalogue" currency="USD" />
    <x-nq::store-account.address-book :addresses="$book" />
    <x-nq::store-account.recently-viewed :ids="['p-c', 'p-e', 'p-d', 'p-a']" :products="$catalogue" currency="USD" />
</div>

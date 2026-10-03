@php
    $orders = [
        [
            'id' => 'o1', 'number' => '#1042', 'placedAt' => '2026-09-27T10:15:00Z', 'status' => 'paid', 'payment' => 'paid',
            'customer' => ['name' => 'Mona Salem', 'email' => 'mona@example.com', 'phone' => '+966 50 123 4567'],
            'lines' => [
                ['id' => 'l1', 'productId' => 'p1', 'variantId' => 'v1', 'name' => 'Coffee beans 250g', 'unitPrice' => 1800, 'quantity' => 2],
                ['id' => 'l2', 'productId' => 'p2', 'variantId' => 'v2', 'name' => 'Paper filters', 'unitPrice' => 600, 'quantity' => 1],
            ],
            'shippingAddress' => ['name' => 'Mona Salem', 'line1' => '12 Olaya St', 'city' => 'Riyadh', 'country' => 'SA'],
            'totals' => ['subtotal' => 4200, 'discount' => 0, 'shipping' => 500, 'tax' => 0, 'total' => 4700, 'itemCount' => 3, 'savings' => 0],
        ],
        [
            'id' => 'o2', 'number' => '#1041', 'placedAt' => '2026-09-26T08:00:00Z', 'status' => 'pending', 'payment' => 'pending',
            'customer' => ['name' => 'Omar Haddad', 'email' => 'omar@example.com'],
            'lines' => [['id' => 'l3', 'productId' => 'p1', 'variantId' => 'v1', 'name' => 'Coffee beans 250g', 'unitPrice' => 1800, 'quantity' => 1]],
            'totals' => ['subtotal' => 1800, 'discount' => 0, 'shipping' => 0, 'tax' => 0, 'total' => 1800, 'itemCount' => 1, 'savings' => 0],
        ],
    ];
    $carts = [
        [
            'id' => 'c1', 'customer' => ['name' => 'Lina Aziz', 'email' => 'lina@example.com'], 'stage' => 'checkout',
            'lines' => [['id' => 'cl1', 'name' => 'Coffee beans 250g', 'unitPrice' => 1800, 'quantity' => 2]],
            'updatedAt' => '2026-09-28T06:00:00Z', 'emailsSent' => 0,
        ],
        [
            'id' => 'c2', 'stage' => 'cart', 'lines' => [['id' => 'cl2', 'name' => 'Paper filters', 'unitPrice' => 600, 'quantity' => 1]],
            'updatedAt' => '2026-09-29T08:30:00Z', 'emailsSent' => 0,
        ],
    ];
    $seller = ['name' => 'Bean & Leaf', 'lines' => ['12 Olaya St', 'Riyadh'], 'email' => 'hello@beanleaf.example', 'taxId' => '300-123-456'];
@endphp
<div class="flex flex-col gap-10">
    <x-nq::store-orders-admin.orders-list :orders="$orders" currency="USD" now="2026-09-29T09:00:00Z" />
    <x-nq::store-orders-admin.order-detail :order="$orders[0]" currency="USD" actor="Mona" can-back now="2026-09-29T09:00:00Z" />
    <x-nq::store-orders-admin.abandoned-carts :carts="$carts" currency="USD" now="2026-09-29T09:00:00Z" />
    <x-nq::store-orders-admin.order-print-view :orders="[$orders[0]]" :seller="$seller" currency="USD" kind="packing-slip" can-close />
</div>

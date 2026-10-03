@php
    $totals = ['sales' => 4820000, 'orders' => 312, 'sessions' => 9400, 'customers' => 280, 'returningCustomers' => 96, 'addToCart' => 1320, 'checkouts' => 540];
    $previousTotals = ['sales' => 4210000, 'orders' => 288, 'sessions' => 8900, 'customers' => 262, 'returningCustomers' => 80, 'addToCart' => 1190, 'checkouts' => 500];
    $series = [
        ['date' => '2026-09-27', 'sales' => 1520000, 'orders' => 98, 'sessions' => 3000],
        ['date' => '2026-09-28', 'sales' => 1610000, 'orders' => 104, 'sessions' => 3100],
        ['date' => '2026-09-29', 'sales' => 1690000, 'orders' => 110, 'sessions' => 3300],
    ];
    $previousSeries = [
        ['date' => '2026-09-20', 'sales' => 1300000, 'orders' => 90, 'sessions' => 2900],
        ['date' => '2026-09-21', 'sales' => 1400000, 'orders' => 96, 'sessions' => 3000],
        ['date' => '2026-09-22', 'sales' => 1510000, 'orders' => 102, 'sessions' => 3000],
    ];
    $products = [[
        'id' => 'p1', 'name' => 'Linen shirt', 'status' => 'active', 'images' => [],
        'options' => [['id' => 'size', 'values' => [['id' => 'm', 'label' => 'M']]]],
        'variants' => [['id' => 'v1', 'sku' => 'LS-M', 'options' => ['size' => 'm'], 'stock' => 2], ['id' => 'v2', 'sku' => 'LS-L', 'options' => ['size' => 'm'], 'stock' => 0]],
    ]];
    $orders = [
        ['id' => 'o1', 'number' => '#1042', 'placedAt' => '2026-09-29T08:12:00Z', 'status' => 'paid', 'customer' => ['name' => 'Sara Ali'], 'totals' => ['total' => 18500]],
        ['id' => 'o2', 'number' => '#1041', 'placedAt' => '2026-09-29T07:40:00Z', 'status' => 'shipped', 'customer' => ['name' => 'Omar Khan'], 'totals' => ['total' => 9900]],
    ];
@endphp
<x-nq::store-dashboard currency="USD" :totals="$totals" :previous-totals="$previousTotals" :series="$series" :previous-series="$previousSeries"
    :top-products="[['id' => 'p1', 'name' => 'Linen shirt', 'units' => 120, 'revenue' => 960000, 'previousRevenue' => 800000], ['id' => 'p2', 'name' => 'Canvas tote', 'units' => 90, 'revenue' => 450000]]"
    :categories="[['id' => 'c1', 'label' => 'Shirts', 'value' => 2100000, 'previous' => 1900000], ['id' => 'c2', 'label' => 'Bags', 'value' => 1300000]]"
    :channels="[['id' => 'web', 'label' => 'Website', 'value' => 3000000], ['id' => 'app', 'label' => 'App', 'value' => 1200000], ['id' => 'pos', 'label' => 'Store', 'value' => 620000]]"
    :cities="[['id' => 'ny', 'label' => 'New York', 'value' => 1800000], ['id' => 'la', 'label' => 'Los Angeles', 'value' => 1100000]]"
    :products="$products" :recent-orders="$orders" :live-visitors="['count' => 74, 'history' => [60, 64, 70, 68, 74]]"
    can-open-product can-open-order can-restock />

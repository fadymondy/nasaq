@php
    $products = [
        ['id' => 'p1', 'name' => 'Espresso', 'price' => 1200, 'taxBps' => 1500, 'category' => 'drinks', 'stock' => 40, 'barcode' => '6281000000011'],
        ['id' => 'p2', 'name' => 'Mint tea', 'price' => 800, 'category' => 'drinks'],
        ['id' => 'p3', 'name' => 'Cheesecake', 'price' => 2000, 'category' => 'food'],
    ];
    $categories = [['id' => 'drinks', 'label' => 'Drinks'], ['id' => 'food', 'label' => 'Food']];
@endphp
<x-nq::pos-register :products="$products" :categories="$categories" currency="SAR" :default-tax-bps="1500" cashier="Lina" />

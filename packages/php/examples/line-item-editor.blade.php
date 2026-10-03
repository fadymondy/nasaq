@php
    $products = [['id' => 'p1', 'name' => 'Coffee beans', 'sku' => 'CB-1', 'price' => 6500, 'taxBps' => 1500]];
    $lines = [['id' => 'a', 'productId' => 'p1', 'name' => 'Coffee beans', 'quantity' => 2, 'unitPrice' => 6500, 'taxBps' => 1500]];
@endphp
<x-nq::line-item-editor :products="$products" :lines="$lines" currency="SAR" :default-tax-bps="1500" />

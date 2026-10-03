@php
    $products = [
        ['id' => 'beans', 'name' => 'Coffee beans 250g', 'sku' => 'RTL-001', 'unit' => 'pcs', 'reorderPoint' => 12],
        ['id' => 'filter', 'name' => 'Paper filters', 'sku' => 'RTL-014', 'unit' => 'box', 'reorderPoint' => 4],
    ];
    $warehouses = [
        ['id' => 'ruh', 'name' => 'Riyadh', 'code' => 'RUH'],
        ['id' => 'jed', 'name' => 'Jeddah', 'code' => 'JED'],
    ];
    $movements = [
        ['id' => 'm1', 'date' => '2026-09-01', 'productId' => 'beans', 'warehouseId' => 'ruh', 'type' => 'receive', 'quantity' => 40, 'reference' => 'PO-2041'],
        ['id' => 'm2', 'date' => '2026-09-05', 'productId' => 'beans', 'warehouseId' => 'ruh', 'type' => 'issue', 'quantity' => -8, 'reference' => 'SO-5520'],
        ['id' => 'm3', 'date' => '2026-09-08', 'productId' => 'beans', 'warehouseId' => 'jed', 'type' => 'receive', 'quantity' => 10, 'reference' => 'PO-2043'],
        ['id' => 'm4', 'date' => '2026-09-10', 'productId' => 'filter', 'warehouseId' => 'ruh', 'type' => 'receive', 'quantity' => 3, 'reference' => 'PO-2044'],
    ];
@endphp
<x-nq::stock-ledger :products="$products" :warehouses="$warehouses" :movements="$movements" can-record />

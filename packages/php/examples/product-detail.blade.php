@php
    // The README Quick start: a whole product in, one event out. Prices are minor units (cents).
    $product = [
        'id' => 'tee',
        'name' => 'Everyday tee',
        'brand' => 'Nasaq Goods',
        'description' => 'A soft cotton tee that holds its shape wash after wash.',
        'images' => [
            ['src' => 'https://picsum.photos/seed/tee-1/800/800', 'alt' => 'Everyday tee, front'],
            ['src' => 'https://picsum.photos/seed/tee-2/800/800', 'alt' => 'Everyday tee, back'],
        ],
        'options' => [
            ['id' => 'color', 'name' => 'Colour', 'display' => 'swatch', 'values' => [['id' => 'black', 'label' => 'Black', 'color' => '#111111'], ['id' => 'sand', 'label' => 'Sand', 'color' => '#d8c3a5']]],
            ['id' => 'size', 'name' => 'Size', 'values' => [['id' => 's', 'label' => 'S'], ['id' => 'm', 'label' => 'M'], ['id' => 'l', 'label' => 'L']]],
        ],
        'variants' => [
            ['id' => 'black-s', 'options' => ['color' => 'black', 'size' => 's'], 'price' => 2900, 'stock' => 8],
            ['id' => 'black-m', 'options' => ['color' => 'black', 'size' => 'm'], 'price' => 2900, 'stock' => 3],
            ['id' => 'black-l', 'options' => ['color' => 'black', 'size' => 'l'], 'price' => 2900, 'stock' => 0],
            ['id' => 'sand-s', 'options' => ['color' => 'sand', 'size' => 's'], 'price' => 2900, 'compareAt' => 3900, 'stock' => 12],
            ['id' => 'sand-m', 'options' => ['color' => 'sand', 'size' => 'm'], 'price' => 2900, 'compareAt' => 3900, 'stock' => 5],
        ],
        'rating' => ['average' => 4.6, 'count' => 128],
    ];
@endphp
{{-- A handler may call $event.detail.wait(promise); a result of { error } shows a failure. --}}
<x-nq::product-detail :product="$product" currency="USD"
    x-on:nq-add-to-cart="console.log('add to cart', $event.detail.variantId, $event.detail.quantity)" />

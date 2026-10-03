@php
    $colour = ['id' => 'colour', 'name' => 'Colour', 'display' => 'button', 'values' => [['id' => 'red', 'label' => 'Red'], ['id' => 'blue', 'label' => 'Blue']]];
    $shirt = [
        'id' => 'p1', 'name' => 'Linen shirt', 'brand' => 'Nile', 'category' => 'Clothing', 'tags' => ['summer'], 'status' => 'active', 'slug' => 'linen-shirt',
        'images' => [['src' => '/img/shirt-a.jpg', 'alt' => 'Front'], ['src' => '/img/shirt-b.jpg', 'alt' => ''], ['src' => '/img/shirt-c.jpg', 'alt' => 'Back']],
        'options' => [$colour],
        'variants' => [
            ['id' => 'v1', 'options' => ['colour' => 'red'], 'price' => 4900, 'compareAt' => 5900, 'stock' => 12, 'sku' => 'LIN-RED'],
            ['id' => 'v2', 'options' => ['colour' => 'blue'], 'price' => 4900, 'stock' => 2, 'sku' => 'LIN-BLUE'],
        ],
    ];
    $tote = ['id' => 'p2', 'name' => 'Canvas tote', 'category' => 'Bags', 'tags' => ['summer', 'bag'], 'status' => 'draft', 'images' => [], 'options' => [], 'variants' => [['id' => 'v3', 'options' => [], 'price' => 1900, 'stock' => 0]]];
    $mug = ['id' => 'p3', 'name' => 'Clay mug', 'brand' => 'Nile', 'category' => 'Home', 'status' => 'active', 'images' => [['src' => '/img/mug.jpg', 'alt' => 'Mug']], 'options' => [], 'variants' => [['id' => 'v4', 'options' => [], 'price' => 1400, 'sku' => 'MUG-1']]];
    $products = [$shirt, $tote, $mug];
    $collections = [
        ['id' => 'c1', 'title' => 'Summer picks', 'kind' => 'manual', 'productIds' => ['p1', 'p2']],
        ['id' => 'c2', 'title' => 'Nile brand', 'kind' => 'rules', 'conditions' => ['kind' => 'group', 'id' => 'g-root', 'join' => 'and', 'children' => [['kind' => 'condition', 'id' => 'r-1', 'field' => 'brand', 'op' => 'is', 'value' => 'Nile']]]],
    ];
@endphp
<div class="flex flex-col gap-10">
    <x-nq::store-products-admin.product-list :products="$products" currency="USD" :page-size="10" />
    <x-nq::store-products-admin.product-editor :product="$shirt" :extra="['cost' => 2000]" currency="USD" can-cancel />
    <x-nq::store-products-admin.media-manager :images="$shirt['images']" />
    <x-nq::store-products-admin.options-editor :options="[$colour]" />
    <x-nq::store-products-admin.variant-matrix :options="[$colour]" :images="$shirt['images']" :variants="$shirt['variants']" currency="USD" />
    <x-nq::store-products-admin.collections-manager :collections="$collections" :products="$products" currency="USD" />
</div>

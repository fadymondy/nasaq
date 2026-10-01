@php
    // A catalogue in, a live listing out. Prices are minor units (cents). Filtering, sorting, paging, compare and quick view run in the browser.
    $img = fn ($seed) => [['src' => "https://picsum.photos/seed/{$seed}-1/600/750", 'alt' => $seed], ['src' => "https://picsum.photos/seed/{$seed}-2/600/750", 'alt' => $seed]];
    $colour = ['id' => 'color', 'name' => 'Colour', 'display' => 'swatch', 'values' => [['id' => 'black', 'label' => 'Black', 'color' => '#111111'], ['id' => 'sand', 'label' => 'Sand', 'color' => '#d8c3a5']]];
    $size = ['id' => 'size', 'name' => 'Size', 'values' => [['id' => 's', 'label' => 'S'], ['id' => 'm', 'label' => 'M']]];
    $v = fn ($id, $c, $s, $price, $stock, $compareAt = null) => array_filter(['id' => $id, 'options' => ['color' => $c, 'size' => $s], 'price' => $price, 'compareAt' => $compareAt, 'stock' => $stock], fn ($x) => $x !== null);
    $simple = fn ($id, $name, $brand, $cat, $price, $stock, $rating, $compareAt = null) => [
        'id' => $id, 'name' => $name, 'brand' => $brand, 'category' => $cat, 'images' => $img($id), 'options' => [],
        'variants' => [array_filter(['id' => $id.'-1', 'options' => [], 'price' => $price, 'compareAt' => $compareAt, 'stock' => $stock], fn ($x) => $x !== null)],
        'rating' => ['average' => $rating, 'count' => 40 + strlen($name) * 3],
    ];
    $products = [
        ['id' => 'tee', 'name' => 'Everyday tee', 'brand' => 'Nasaq Goods', 'category' => 'tops', 'description' => 'A soft cotton tee.', 'images' => $img('tee'), 'options' => [$colour, $size],
            'variants' => [$v('tee-b-s', 'black', 's', 2900, 8), $v('tee-b-m', 'black', 'm', 2900, 3), $v('tee-s-s', 'sand', 's', 2900, 12, 3900), $v('tee-s-m', 'sand', 'm', 2900, 5, 3900)], 'rating' => ['average' => 4.6, 'count' => 128]],
        ['id' => 'hoodie', 'name' => 'Zip hoodie', 'brand' => 'Nasaq Goods', 'category' => 'tops', 'images' => $img('hoodie'), 'options' => [$colour],
            'variants' => [['id' => 'hoodie-b', 'options' => ['color' => 'black'], 'price' => 6900, 'compareAt' => 8900, 'stock' => 3], ['id' => 'hoodie-s', 'options' => ['color' => 'sand'], 'price' => 6900, 'stock' => 4]], 'rating' => ['average' => 4.2, 'count' => 64]],
        $simple('cap', 'Canvas cap', 'Atlas', 'accessories', 1900, 0, 3.8),
        $simple('belt', 'Leather belt', 'Atlas', 'accessories', 3400, 9, 4.8),
        $simple('socks', 'Wool socks', 'Atlas', 'accessories', 1200, 40, 4.1, 1600),
        $simple('scarf', 'Linen scarf', 'Nasaq Goods', 'accessories', 2700, 6, 4.4),
    ];
    $tree = [['id' => 'tops', 'label' => 'Tops'], ['id' => 'accessories', 'label' => 'Accessories']];
@endphp
<x-nq::store-listing title="Shop" :products="$products" currency="USD" :category-tree="$tree" :page-size="4" :popular-searches="['tee', 'hoodie']"
    x-on:nq-add-to-cart="console.log('add to cart', $event.detail.variantId, $event.detail.quantity)" />

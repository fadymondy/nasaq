@php
    // Home page blocks: hero, category tiles, flash deals and a recently viewed row. Prices are minor units; times are epoch milliseconds.
    $img = fn ($seed) => [['src' => "https://picsum.photos/seed/{$seed}/600/750", 'alt' => $seed]];
    $mk = fn ($id, $name, $price, $compareAt = null) => [
        'id' => $id, 'name' => $name, 'brand' => 'Nasaq Goods', 'category' => 'Clothing', 'images' => $img($id), 'options' => [],
        'variants' => [array_filter(['id' => $id.'-1', 'options' => [], 'price' => $price, 'compareAt' => $compareAt, 'stock' => 12], fn ($x) => $x !== null)],
    ];
    $all = [$mk('tee', 'Everyday tee', 2900, 3900), $mk('hoodie', 'Zip hoodie', 6900), $mk('cap', 'Canvas cap', 1900), $mk('belt', 'Leather belt', 3400), $mk('scarf', 'Linen scarf', 2700)];
    $hero = [
        ['id' => 'summer', 'eyebrow' => 'New season', 'title' => 'Summer collection', 'description' => 'Light layers for warm days.', 'cta' => 'Shop now', 'href' => '#summer', 'image' => 'https://picsum.photos/seed/hero-1/1200/700', 'tone' => 'brand'],
        ['id' => 'sale', 'title' => 'Up to 40% off', 'description' => 'Last chance on winter favourites.', 'href' => '#sale', 'image' => 'https://picsum.photos/seed/hero-2/1200/700', 'tone' => 'dark'],
    ];
    $tiles = [
        ['id' => 'tops', 'label' => 'Tops', 'count' => 42, 'image' => 'https://picsum.photos/seed/tops/400/400'],
        ['id' => 'bottoms', 'label' => 'Bottoms', 'count' => 28, 'image' => 'https://picsum.photos/seed/bottoms/400/400'],
        ['id' => 'accessories', 'label' => 'Accessories', 'count' => 64, 'image' => 'https://picsum.photos/seed/acc/400/400'],
    ];
    $nowMs = now()->getTimestamp() * 1000;
    $deals = [
        ['id' => 'd1', 'product' => $all[0], 'endsAt' => $nowMs + 5 * 3_600_000, 'sold' => 34, 'total' => 50],
        ['id' => 'd2', 'product' => $all[1], 'endsAt' => $nowMs + 9 * 3_600_000, 'sold' => 12, 'total' => 40],
    ];
    $viewed = [$all[2], $all[3], $all[4]];
@endphp
<div class="flex flex-col gap-10">
    <x-nq::store-merch.hero-banner :items="$hero" />
    <x-nq::store-merch.category-tiles :items="$tiles" />
    <x-nq::store-merch.flash-deals :deals="$deals" currency="USD" />
    <x-nq::store-merch.product-carousel title="Recently viewed" :products="$viewed" currency="USD" />
</div>

@php
    $products = [
        ['id' => 'tee', 'name' => 'Everyday tee', 'brand' => 'Nasaq Goods', 'category' => 'tops', 'images' => [], 'options' => [], 'variants' => [['id' => 'tee-1', 'options' => (object) [], 'price' => 2900, 'stock' => 8]]],
        ['id' => 'hoodie', 'name' => 'Zip hoodie', 'brand' => 'Nasaq Goods', 'category' => 'tops', 'images' => [], 'options' => [], 'variants' => [['id' => 'hoodie-1', 'options' => (object) [], 'price' => 6900, 'stock' => 3]]],
        ['id' => 'belt', 'name' => 'Leather belt', 'brand' => 'Atlas', 'category' => 'accessories', 'images' => [], 'options' => [], 'variants' => [['id' => 'belt-1', 'options' => (object) [], 'price' => 3400, 'stock' => 9]]],
    ];
    $nav = [
        ['id' => 'women', 'label' => 'Women', 'href' => '/women', 'columns' => [
            ['title' => 'Clothing', 'links' => [['label' => 'Tops', 'href' => '/women/tops', 'badge' => 'New'], ['label' => 'Dresses', 'href' => '/women/dresses']], 'viewAll' => ['label' => 'View all clothing', 'href' => '/women/clothing']],
            ['title' => 'Accessories', 'links' => [['label' => 'Belts', 'href' => '/women/belts'], ['label' => 'Scarves', 'href' => '/women/scarves']]],
        ], 'featured' => ['title' => 'Spring edit', 'description' => 'Light layers for warmer days.', 'href' => '/spring']],
        ['id' => 'men', 'label' => 'Men', 'href' => '/men'],
        ['id' => 'sale', 'label' => 'Sale', 'href' => '/sale', 'highlight' => true],
    ];
@endphp
<div>
    <x-nq::store-chrome.header :nav="$nav" cart-button :cart-count="2" :wishlist-count="1" account-button
        :search="['products' => $products, 'categoryTree' => [['id' => 'tops', 'label' => 'Tops'], ['id' => 'accessories', 'label' => 'Accessories']], 'currency' => 'USD', 'popular' => ['tee', 'hoodie']]">
        <x-slot:announcement>
            <x-nq::store-chrome.announcement-bar :items="[['id' => 'ship', 'content' => 'Free shipping on orders over $50'], ['id' => 'returns', 'content' => '30-day returns on everything', 'href' => '/returns']]" />
        </x-slot:announcement>
        <x-slot:brand>Nasaq Goods</x-slot:brand>
    </x-nq::store-chrome.header>
    <x-nq::store-chrome.footer newsletter language="en" currency="USD"
        :columns="[['title' => 'Help', 'links' => [['label' => 'Shipping', 'href' => '/shipping'], ['label' => 'Returns', 'href' => '/returns']]]]"
        :social="[['label' => 'Instagram', 'href' => 'https://instagram.com/nasaq']]"
        :languages="[['value' => 'en', 'label' => 'English'], ['value' => 'ar', 'label' => 'العربية']]"
        :currencies="[['value' => 'USD', 'label' => 'USD'], ['value' => 'SAR', 'label' => 'SAR']]">
        <x-slot:brand>Nasaq Goods</x-slot:brand>
        <x-slot:tagline>Everyday basics, made to last.</x-slot:tagline>
        <x-slot:payments><span class="text-caption">Visa</span><span class="text-caption">Mada</span></x-slot:payments>
        <x-slot:legal>© 2026 Nasaq Goods. All rights reserved.</x-slot:legal>
    </x-nq::store-chrome.footer>
</div>

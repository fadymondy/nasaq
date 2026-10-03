<div x-data="{ rail: false, collapsed: false }" class="flex w-64 flex-col gap-4">
    <div class="flex justify-end">
        <x-nq::product-switcher current="mahaam" all-href="/apps" :products="[
            ['id' => 'mahaam', 'brand' => 'mahaam', 'name' => 'Mahaam', 'href' => 'https://mahaam.app', 'pinned' => true, 'badge' => 3],
            ['id' => 'zekra', 'brand' => 'zekra', 'name' => 'Zekra', 'pinned' => true],
            ['id' => 'custom', 'name' => 'Custom app', 'description' => 'A host app'],
        ]" />
    </div>
    <x-nq::product-switcher.sidebar-products current="mahaam" :products="[
        ['id' => 'mahaam', 'brand' => 'mahaam', 'name' => 'Mahaam', 'href' => 'https://mahaam.app', 'pinned' => true, 'badge' => 3],
        ['id' => 'zekra', 'brand' => 'zekra', 'name' => 'Zekra', 'pinned' => true],
        ['id' => 'custom', 'name' => 'Custom app'],
    ]" />
</div>

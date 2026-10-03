<x-nq::translations.provider :messages="[
    'en' => ['greeting' => 'Hello, {name}', 'cart' => ['items_one' => '{count} item in your cart', 'items_other' => '{count} items in your cart']],
    'ar' => ['greeting' => 'مرحبا، {name}', 'cart' => ['items_zero' => 'سلتك فارغة', 'items_one' => 'منتج واحد في سلتك', 'items_two' => 'منتجان في سلتك', 'items_few' => '{count} منتجات في سلتك', 'items_many' => '{count} منتجا في سلتك', 'items_other' => '{count} منتج في سلتك']],
]">
    <div class="flex flex-col gap-2">
        <p class="text-title"><x-nq::translations.text key="greeting" :vars="['name' => 'Sara']" /></p>
        <p><x-nq::translations.text key="cart.items" :vars="['count' => 1]" /></p>
        <p><x-nq::translations.text key="cart.items" :vars="['count' => 3]" /></p>
        <p><x-nq::translations.text key="missing.key" :vars="['defaultValue' => 'Fallback text']" /></p>
        <div class="flex gap-2">
            <x-nq::button variant="outline" size="sm" x-on:click="setLocale(`en`)">English</x-nq::button>
            <x-nq::button variant="outline" size="sm" x-on:click="setLocale(`ar`)">العربية</x-nq::button>
        </div>
    </div>
</x-nq::translations.provider>

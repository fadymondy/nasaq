{{-- <x-nq::store-cart.empty />
     "Your cart is empty": an icon, a title and a Start shopping button that fires "store-cart-continue". action="false" leaves the button out.
     Inside the cart or mini cart. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['action' => true])
<x-nq::states kind="store-cart-empty" icon="shopping-bag" :title="\Nasaq\Nasaq::t('Your cart is empty', 'سلتك فارغة')" :description="\Nasaq\Nasaq::t('Add something you like and it will wait for you here.', 'أضف ما يعجبك وسيبقى هنا في انتظارك.')" {{ $attributes }}>
    @if ($action)
        <x-slot:actions>
            <x-nq::button variant="primary" x-on:click="continueShopping()">{{ \Nasaq\Nasaq::t('Start shopping', 'ابدأ التسوق') }}</x-nq::button>
        </x-slot:actions>
    @endif
</x-nq::states>

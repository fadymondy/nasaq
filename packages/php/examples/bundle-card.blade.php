<x-nq::bundle-card title="Agency kit" description="Run client projects and remember every decision." includes="Mahaam · Zekra" :price="18" :compare-at="21">
    <x-slot:items>
        <x-nq::bundle-card.item><x-nq::product-artwork brand="mahaam" :mark-size="24" /></x-nq::bundle-card.item>
        <x-nq::bundle-card.item><x-nq::product-artwork brand="zekra" :mark-size="24" /></x-nq::bundle-card.item>
    </x-slot:items>
    <x-slot:action><x-nq::button size="sm">Get the kit</x-nq::button></x-slot:action>
</x-nq::bundle-card>

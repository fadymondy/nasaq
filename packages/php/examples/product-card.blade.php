<x-nq::product-card.grid>
    <x-nq::product-card name="Zekra" category="AI memory" badge="New" description="A memory organ for AI agents: what one session learns, the next one already knows.">
        <x-slot:artwork>
            <div class="grid place-items-center rounded-card bg-secondary"><x-nq::product-mark brand="zekra" :size="48" /></div>
        </x-slot:artwork>
        <x-slot:meta><span class="text-caption text-muted-foreground">4.9 (860)</span></x-slot:meta>
        <x-slot:price><span class="text-label text-foreground">{{ Nasaq\Nasaq::money(9) }} / {{ Nasaq\Nasaq::t('month', 'شهر') }}</span></x-slot:price>
    </x-nq::product-card>
</x-nq::product-card.grid>

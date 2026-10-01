<x-nq::plan-card.grid>
    <x-nq::plan-card name="Solo" description="For one person." :features="['1 project', 'Community support']">
        <x-slot:price><span class="text-h2 font-semibold tracking-tight text-foreground">{{ Nasaq\Nasaq::money(0) }}</span></x-slot:price>
        <x-slot:action><x-nq::button variant="secondary">Start free</x-nq::button></x-slot:action>
    </x-nq::plan-card>
    <x-nq::plan-card highlighted name="Team" description="For small teams." price-note="Billed yearly" features-title="Everything in Solo, plus" :features="['Unlimited projects', ['label' => 'SSO', 'included' => false]]" footnote="No card required" badge="Most popular">
        <x-slot:price><span class="text-h2 font-semibold tracking-tight text-foreground">{{ Nasaq\Nasaq::money(12) }}</span></x-slot:price>
        <x-slot:action><x-nq::button variant="primary">Start trial</x-nq::button></x-slot:action>
    </x-nq::plan-card>
</x-nq::plan-card.grid>

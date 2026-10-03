<x-nq::stat-card.grid>
    <x-nq::stat-card label="Revenue" :value="48210" :format="['style' => 'currency', 'currency' => 'USD', 'compact' => true]" :delta="0.124" delta-label="vs last month" :sparkline="[18, 24, 21, 30, 28, 36]" sparkline-label="Revenue, last 6 weeks, up 12%">
        <x-slot:icon><x-lucide-wallet /></x-slot:icon>
    </x-nq::stat-card>
    <x-nq::stat-card label="Refund rate" :value="0.031" :format="['style' => 'percent', 'maxFraction' => 1]" :delta="-0.03" invert delta-label="vs last month" />
    <x-nq::stat-card label="Orders" loading />
</x-nq::stat-card.grid>

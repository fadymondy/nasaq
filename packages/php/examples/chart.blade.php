@php
    $config = ['revenue' => ['label' => 'Revenue'], 'cost' => ['label' => 'Cost', 'color' => 'var(--nq-tag-amber)']];
@endphp
<x-nq::chart :config="$config" label="Revenue and cost, January to March" class="aspect-auto h-64 flex-col items-center gap-4">
    <x-nq::chart.sparkline :data="[18600, 30500, 23700]" color="var(--color-revenue)" label="Revenue, January to March" class="h-24 w-full" />
    <x-nq::chart.tooltip :config="$config" label="Feb" :payload="[['dataKey' => 'revenue', 'value' => 30500], ['dataKey' => 'cost', 'value' => 18400]]" :value-format="['style' => 'currency', 'currency' => 'USD', 'maximumFractionDigits' => 0]" />
    <x-nq::chart.legend :config="$config" :payload="[['dataKey' => 'revenue', 'color' => 'var(--color-revenue)'], ['dataKey' => 'cost', 'color' => 'var(--color-cost)']]" />
</x-nq::chart>

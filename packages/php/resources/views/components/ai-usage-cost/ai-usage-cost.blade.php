{{-- <x-nq::ai-usage-cost currency="USD" :markup="0.2" :days="[['date' => '2026-09-28', 'billed' => 12.4, 'unbilled' => 0]]"
         :by-model="[['id' => 'opus', 'label' => 'Opus 5.5', 'tokensIn' => 2400000, 'tokensOut' => 310000, 'cost' => 21.5]]" />
     AI spend at a glance: total, tokens, billed, unbilled and (with markup) the client price, a daily stacked bar of billed and unbilled cost, and tabs
     breaking the cost down by model, product or run with token columns. The chart is hand-drawn bars (no library); time runs right to left in RTL.
     days: oldest first, ['date' => 'YYYY-MM-DD', 'billed', 'unbilled']. by-model / by-product / by-run: ['id', 'label', 'tokensIn', 'tokensOut', 'cost', 'previous'];
     a tab appears for each one given. markup: fraction over provider cost (0.2 is +20%), adds the client price tile. previous-total: adds the change on the total
     tile (a rise is the bad tone). currency: ISO code (USD, or SAR in Arabic). loading: skeletons. labels: array overriding the built-in words.
     Sibling: <x-nq::ai-usage-cost.token-meter>. Needs the Alpine runtime for the tabs (@nasaqScripts). --}}
@include('nasaq::components.metric-tiles._logic')
@include('nasaq::components.ai-usage-cost._logic')
@props(['days' => [], 'byModel' => null, 'byProduct' => null, 'byRun' => null, 'markup' => null, 'previousTotal' => null, 'currency' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $cur = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $t = nq_auc_words($locale, $labels);
    $days = array_values($days);
    $billed = array_sum(array_column($days, 'billed'));
    $unbilled = array_sum(array_column($days, 'unbilled'));
    $total = $billed + $unbilled;
    $primary = $byModel ?? $byProduct ?? $byRun ?? [];
    $tokens = array_sum(array_map(fn ($r) => $r['tokensIn'] + $r['tokensOut'], $primary));
    $delta = $previousTotal && $previousTotal > 0 ? ($total - $previousTotal) / $previousTotal : null;
    $money = ['style' => 'currency', 'currency' => $cur];
    $max = max(0.0001, ...array_map(fn ($d) => $d['billed'] + $d['unbilled'], $days ?: [['billed' => 0, 'unbilled' => 0]]));
    $bars = array_map(function ($d) use ($locale, $t, $max, $cur) {
        $label = nq_auc_day($d['date'], $locale);
        $fmt = fn ($v) => nq_auc_fmt($v, $locale, 'money', $cur);

        return ['label' => $label, 'billed' => $d['billed'] / $max * 100, 'unbilled' => $d['unbilled'] / $max * 100,
            'title' => $label.': '.$t['billed'].' '.$fmt($d['billed']).', '.$t['unbilled'].' '.$fmt($d['unbilled'])];
    }, $days);
    $config = ['billed' => ['label' => $t['billed'], 'color' => 'var(--primary)'], 'unbilled' => ['label' => $t['unbilled'], 'color' => 'var(--nq-warning)']];
    $legend = [['dataKey' => 'billed', 'color' => 'var(--color-billed)'], ['dataKey' => 'unbilled', 'color' => 'var(--color-unbilled)']];
    $tabs = array_values(array_filter([
        ['id' => 'model', 'label' => $t['byModel'], 'dim' => $t['model'], 'rows' => $byModel],
        ['id' => 'product', 'label' => $t['byProduct'], 'dim' => $t['product'], 'rows' => $byProduct],
        ['id' => 'run', 'label' => $t['byRun'], 'dim' => $t['run'], 'rows' => $byRun],
    ], fn ($x) => ! empty($x['rows'])));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ai-usage-cost') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :loading="$loading" :label="$t['total']" :value="$total" :format="$money + ['maxFraction' => 0]" :delta="$delta" :delta-label="$t['vsPrevious']" invert :locale="$locale">
            <x-slot:icon><x-lucide-wallet /></x-slot:icon>
        </x-nq::stat-card>
        <x-nq::stat-card :loading="$loading" :label="$t['tokens']" :value="$tokens" :format="['compact' => true, 'maxFraction' => 1]" :locale="$locale">
            <x-slot:icon><x-lucide-cpu /></x-slot:icon>
        </x-nq::stat-card>
        <x-nq::stat-card :loading="$loading" :label="$t['billed']" :value="$billed" :format="$money + ['maxFraction' => 2]" :locale="$locale">
            <x-slot:icon><x-lucide-receipt-text /></x-slot:icon>
        </x-nq::stat-card>
        <x-nq::stat-card :loading="$loading" :label="$t['unbilled']" :value="$unbilled" :format="$money + ['maxFraction' => 2]" :locale="$locale">
            <x-slot:icon><x-lucide-coins /></x-slot:icon>
        </x-nq::stat-card>
        @if ($markup !== null)
            <x-nq::stat-card :loading="$loading" :label="sprintf($t['clientPrice'], nq_mt_number($markup, ['style' => 'percent', 'maxFraction' => 0], $locale))" :value="$total * (1 + max(0, $markup))" :format="$money + ['maxFraction' => 2]" :locale="$locale">
                <x-slot:icon><x-lucide-sparkles /></x-slot:icon>
            </x-nq::stat-card>
        @endif
    </x-nq::stat-card.grid>

    <x-nq::card>
        <x-nq::card.header>
            <x-nq::card.title as="h3" class="text-h3">{{ $t['daily'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['dailyHint'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content>
            <x-nq::chart :config="$config" :label="$t['daily'].'. '.sprintf($t['chartLabel'], count($days))" class="aspect-auto h-52 flex-col justify-start gap-2">
                <div class="flex min-h-0 flex-1 gap-2">
                    <div aria-hidden="true" class="flex w-12 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
                        <span>{{ nq_mt_number($max, ['style' => 'currency', 'currency' => $cur, 'maxFraction' => 0], $locale) }}</span>
                        <span>{{ nq_mt_number(0, ['style' => 'currency', 'currency' => $cur, 'maxFraction' => 0], $locale) }}</span>
                    </div>
                    <div class="flex min-w-0 flex-1 items-end gap-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
                        @foreach ($bars as $bar)
                            <div data-slot="chart-bar" title="{{ $bar['title'] }}" class="flex h-full min-w-0 flex-1 flex-col-reverse justify-start">
                                <span class="block w-full" style="height: {{ round($bar['billed'], 4) }}%; background-color: var(--color-billed)"></span>
                                <span class="block w-full rounded-t-[3px]" style="height: {{ round($bar['unbilled'], 4) }}%; background-color: var(--color-unbilled)"></span>
                            </div>
                        @endforeach
                    </div>
                </div>
                <div aria-hidden="true" class="flex justify-between ps-14 text-muted-foreground"><span>{{ $bars[0]['label'] ?? '' }}</span><span>{{ $bars ? end($bars)['label'] : '' }}</span></div>
                <x-nq::chart.legend :config="$config" :payload="$legend" />
            </x-nq::chart>
        </x-nq::card.content>
    </x-nq::card>

    @if (count($tabs) > 0)
        <x-nq::tabs :default-value="$tabs[0]['id']">
            <x-nq::tabs.list :aria-label="$t['breakdownBy']">
                @foreach ($tabs as $x)
                    <x-nq::tabs.tab :value="$x['id']">{{ $x['label'] }}</x-nq::tabs.tab>
                @endforeach
            </x-nq::tabs.list>
            @foreach ($tabs as $x)
                @php
                    $rows = array_map(fn ($r) => ['id' => $r['id'], 'label' => $r['label'], 'value' => $r['cost'], 'previous' => $r['previous'] ?? null, 'cells' => [
                        'in' => nq_auc_fmt($r['tokensIn'], $locale), 'out' => nq_auc_fmt($r['tokensOut'], $locale),
                    ]], $x['rows']);
                @endphp
                <x-nq::tabs.panel :value="$x['id']" class="pt-3">
                    <x-nq::breakdown-table
                        :rows="$rows"
                        :label="$t['breakdownBy'].': '.$x['label']"
                        :dimension-label="$x['dim']"
                        :value-label="$t['cost']"
                        :format="$money + ['maxFraction' => 2]"
                        :columns="[['id' => 'in', 'header' => $t['tokensIn'], 'align' => 'end'], ['id' => 'out', 'header' => $t['tokensOut'], 'align' => 'end']]"
                        invert
                        ltr-labels
                        :loading="$loading"
                        :locale="$locale" />
                </x-nq::tabs.panel>
            @endforeach
        </x-nq::tabs>
    @endif
</div>

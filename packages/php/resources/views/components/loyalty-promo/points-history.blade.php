{{-- <x-nq::loyalty-promo.points-history :entries="$entries" />
     The points ledger, newest first: what was earned, redeemed or lapsed, with the balance after each line. Direction is a sign and a label, not colour alone.
     entries: [['id', 'kind' => earn|redeem|expire|adjust, 'points' (signed), 'date' (ISO), 'note', 'balanceAfter'?]]. loading: skeleton rows. labels: override any built-in string by key. locale. --}}
@include('nasaq::components.loyalty-promo._logic')
@props(['entries' => [], 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_loyalty_words($locale, (array) $labels);
    $num = fn ($v) => nq_loyalty_num($v, $locale);
    $tone = ['earn' => 'success', 'redeem' => 'info', 'expire' => 'warning', 'adjust' => 'neutral'];
    $rows = array_values(array_map(fn ($e) => (array) $e, (array) $entries));
    usort($rows, fn ($a, $b) => strtotime((string) $b['date']) <=> strtotime((string) $a['date']));
    $id = 'nq-points-'.substr(md5(json_encode($rows)), 0, 8);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'points-history') }}" aria-labelledby="{{ $id }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-2') }}>
    <h2 id="{{ $id }}" class="text-h3 text-foreground">{{ $t['history'] }}</h2>
    @if ($loading)
        <div aria-busy="true" class="flex flex-col gap-2">
            <x-nq::states.skeleton class="h-12 w-full" />
            <x-nq::states.skeleton class="h-12 w-full" />
        </div>
    @elseif (count($rows) === 0)
        <x-nq::states.empty icon="award" :title="$t['noHistory']" :description="$t['noHistoryHint']" />
    @else
        <ul class="flex flex-col divide-y divide-border rounded-card border border-border">
            @foreach ($rows as $e)
                <li class="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <span class="truncate text-body-sm text-foreground">{{ $e['note'] }}</span>
                        <span class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                            <x-nq::status :tone="$tone[$e['kind']] ?? 'neutral'">{{ $t['kinds'][$e['kind']] ?? $e['kind'] }}</x-nq::status>
                            <x-nq::numeric.date-time :value="$e['date']" date-style="medium" :locale="$locale" />
                        </span>
                    </div>
                    <div class="flex shrink-0 flex-col items-end">
                        <span class="text-body-sm font-medium tabular-nums text-foreground"><bdi dir="ltr">{{ $e['points'] > 0 ? '+' : ($e['points'] < 0 ? '−' : '') }}{{ $num(abs($e['points'])) }}</bdi></span>
                        @if (isset($e['balanceAfter']))<span class="text-caption text-muted-foreground">{{ nq_loyalty_say($t['balanceAfter'], $num($e['balanceAfter'])) }}</span>@endif
                    </div>
                </li>
            @endforeach
        </ul>
    @endif
</section>

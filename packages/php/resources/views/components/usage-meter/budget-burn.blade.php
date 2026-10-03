{{-- <x-nq::usage-meter.budget-burn :hours="['used' => 96, 'budget' => 160]" :money="['used' => 7200, 'budget' => 12000, 'currency' => 'USD']" :elapsed="0.5" />
     A project or period budget in hours and money, with the pace. With elapsed (0..1, the fraction of the period gone) each bar draws a tick and projects the
     end-of-period figure at the current rate. thresholds and labels as usage-meter. --}}
@include('nasaq::components.usage-meter._logic')
@props(['hours' => null, 'money' => null, 'elapsed' => null, 'thresholds' => [], 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_um_words($locale, $labels);
    $hint = function ($used, $budget, $kind, $currency = null) use ($elapsed, $locale, $t) {
        if ($elapsed === null) {
            return null;
        }
        $p = nq_um_burn($used, $budget, $elapsed);
        $f = fn ($n) => nq_um_amount($n, $kind, $locale, $t, null, $currency);

        return $p['willExceed'] ? nq_um_fill($t['projectedOver'], '', $f($p['projected']), $f($p['overBy'])) : nq_um_fill($t['projectedWithin'], '', $f($p['projected']));
    };
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'budget-burn') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    @if ($hours)
        <x-nq::usage-meter :label="$t['hours']" kind="hours" :used="$hours['used']" :limit="$hours['budget']" :thresholds="$thresholds" :marker="$elapsed" :hint="$hint($hours['used'], $hours['budget'], 'hours')" :labels="$labels" :locale="$locale" />
    @endif
    @if ($money)
        <x-nq::usage-meter :label="$t['budget']" kind="money" :currency="$money['currency'] ?? null" :used="$money['used']" :limit="$money['budget']" :thresholds="$thresholds" :marker="$elapsed" :hint="$hint($money['used'], $money['budget'], 'money', $money['currency'] ?? null)" :labels="$labels" :locale="$locale" />
    @endif
    @if ($elapsed !== null)
        @php
            $pct = class_exists(\NumberFormatter::class) ? (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::PERCENT))->format($elapsed) : round($elapsed * 100).'%';
        @endphp
        <p class="text-caption text-muted-foreground">{{ nq_um_fill($t['periodElapsed'], $pct) }}</p>
    @endif
</div>

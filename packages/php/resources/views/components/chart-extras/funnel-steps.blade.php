{{-- <x-nq::chart-extras.funnel-steps :steps="[['id' => 'visit', 'label' => 'Visit', 'count' => 12000, 'detail' => '/'], ['id' => 'paid', 'label' => 'Paid', 'count' => 910]]" />
     A funnel drawn as centred bars that narrow with each step, with the step-to-step conversion and the people lost written between them. The
     step with the biggest drop gets an icon and text. steps: rows of id, label, count, optional detail (kept left-to-right: an event, a path).
     summary: overall conversion under the last step (default true). label: accessible name. labels: array overriding the words.
     For a comparison by source or saved funnels use the funnel-chart. --}}
@include('nasaq::components.chart-extras._logic')
@props(['steps' => [], 'summary' => true, 'label' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_cx_words($locale, $labels);
    $rows = nq_cx_funnel_rows($steps);
    $n = count($rows);
    $first = $rows[0]['step']['count'] ?? 0;
    $worst = nq_cx_biggest_drop($rows);
    $overall = $n > 1 ? ($first > 0 ? min(1, max(0, $rows[$n - 1]['step']['count'] / $first)) : 0) : ($n === 1 && $first > 0 ? 1 : 0);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'funnel-steps') }}" role="group" aria-label="{{ $label ?? $t['funnel'] }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col') }}>
    @foreach ($rows as $i => $r)
        <div data-slot="funnel-steps-step" class="flex flex-col">
            @if ($i > 0)
                <div data-slot="funnel-steps-link" class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1.5 text-caption text-muted-foreground">
                    <x-lucide-arrow-down aria-hidden="true" class="size-3.5 shrink-0" />
                    <span class="tabular-nums">{{ sprintf($t['continued'], nq_cx_number($r['fromPrevious'], $locale, 'percent', 1)) }}</span>
                    <span aria-hidden="true">·</span>
                    <span class="tabular-nums">{{ sprintf($t['left'], nq_cx_number($r['dropped'], $locale)) }}</span>
                    @if ($i === $worst)
                        <x-nq::badge variant="warning"><x-lucide-triangle-alert aria-hidden="true" class="size-3" />{{ $t['biggest'] }}</x-nq::badge>
                    @endif
                </div>
            @endif
            <div class="flex items-baseline justify-between gap-3 text-body-sm">
                <span class="min-w-0 truncate text-foreground">
                    <span class="sr-only">{{ sprintf($t['stepOf'], $i + 1, $n) }}. </span>
                    {{ $r['step']['label'] }}
                    @if (! empty($r['step']['detail']))<bdi dir="ltr" class="ms-2 text-caption text-muted-foreground">{{ $r['step']['detail'] }}</bdi>@endif
                </span>
                <span class="shrink-0 tabular-nums text-foreground">
                    <x-nq::numeric :value="$r['step']['count']" />
                    @if ($i > 0)<span class="ms-2 text-caption text-muted-foreground"><x-nq::numeric :value="$r['fromFirst']" style="percent" :max-fraction="1" /></span>@endif
                </span>
            </div>
            <div class="mt-1 flex h-7 justify-center" aria-hidden="true">
                <span class="h-full rounded-control" style="width: {{ nq_cx_css(nq_cx_funnel_bar_share($r['step']['count'], $first) * 100) }}%; background-color: var(--primary); opacity: {{ nq_cx_css(1 - ($i / max(1, $n)) * 0.55) }}"></span>
            </div>
        </div>
    @endforeach
    @if ($summary && $n > 1)
        <p data-slot="funnel-steps-summary" class="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-body-sm">
            <span class="text-muted-foreground">{{ $t['overall'] }}</span>
            <span class="text-label tabular-nums text-foreground"><x-nq::numeric :value="$overall" style="percent" :max-fraction="1" /></span>
        </p>
    @endif
</div>

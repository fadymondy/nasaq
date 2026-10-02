{{-- <x-nq::report-sheet title="Deals report" subtitle="Q3" :filters="[['label' => 'Owner', 'value' => 'Sara']]"> <x-slot:toolbar><x-nq::report-export-menu :document="$doc" /></x-slot:toolbar> sections… </x-nq::report-sheet>
     The page a report prints on. On screen a bordered sheet; printed it drops the frame and everything else on the page, breaks between sections and keeps colours.
     Anything with data-print-hide (or print:hidden) stays off paper. Write chart and table sections as <section> so a page break never cuts one in half.
     title, subtitle, filters: [['label', 'value']] printed under the title so a paper copy is self-explanatory,
     generated-at: when the report was made (default now), time-zone (default the app timezone). Slots: toolbar (screen only), footer. labels: override the strings by key. --}}
@props(['title' => null, 'subtitle' => null, 'filters' => null, 'generatedAt' => null, 'timeZone' => null, 'labels' => []])
@php
    $N = \Nasaq\Nasaq::class;
    $L = array_merge([
        'reportFilters' => $N::t('Filters', 'المرشّحات'),
        'generated' => $N::t('Generated', 'أُنشئ في'),
    ], (array) $labels);
    $zone = $timeZone ?: config('app.timezone', 'UTC');
    $made = $generatedAt ? \Carbon\CarbonImmutable::parse($generatedAt) : \Carbon\CarbonImmutable::now();
    $made = $made->setTimezone($zone);
    $locale = $N::rtl() ? 'ar-SA' : str_replace('_', '-', app()->getLocale());
    $stamp = class_exists(\IntlDateFormatter::class)
        ? (new \IntlDateFormatter($locale.'@numbers=latn', \IntlDateFormatter::MEDIUM, \IntlDateFormatter::SHORT, $zone))->format($made)
        : $made->format('M j, Y, g:i A');
@endphp
<article data-slot="{{ $attributes->get('data-slot', 'report-sheet') }}" {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-6 rounded-card border border-border bg-card p-4 sm:p-6') }}>
    @verbatim
    <style>@media print {
  body * { visibility: hidden !important; }
  [data-slot="report-sheet"], [data-slot="report-sheet"] * { visibility: visible !important; }
  [data-slot="report-sheet"] { position: absolute; inset-inline-start: 0; inset-block-start: 0; width: 100%; box-shadow: none; border: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  [data-slot="report-sheet"] [data-print-hide] { display: none !important; }
  [data-slot="report-sheet"] section, [data-slot="report-sheet"] tr, [data-slot="report-sheet"] figure { break-inside: avoid; }
}
@page { margin: 14mm; }</style>
    @endverbatim
    <header class="flex flex-col gap-2 border-b border-border pb-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
                <h1 class="text-title text-foreground">{{ $title }}</h1>
                @if ($subtitle)
                    <p class="text-body text-muted-foreground">{{ $subtitle }}</p>
                @endif
            </div>
            @if (isset($toolbar))
                <div data-print-hide class="flex items-center gap-2 print:hidden">{{ $toolbar }}</div>
            @endif
        </div>
        @if (! empty($filters))
            <dl aria-label="{{ $L['reportFilters'] }}" class="flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
                @foreach ($filters as $f)
                    <div class="flex gap-1.5">
                        <dt class="text-muted-foreground">{{ $f['label'] }}:</dt>
                        <dd class="text-foreground">{{ $f['value'] }}</dd>
                    </div>
                @endforeach
            </dl>
        @endif
        <p class="text-caption text-muted-foreground">{{ $L['generated'] }} {{ $stamp }}</p>
    </header>
    {{ $slot }}
    @if (isset($footer))
        <footer class="border-t border-border pt-3 text-caption text-muted-foreground">{{ $footer }}</footer>
    @endif
</article>

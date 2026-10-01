{{-- <x-nq::stat-card label="Revenue" :value="48210" :format="['style' => 'currency', 'currency' => 'USD', 'compact' => true]" :delta="0.124" delta-label="vs last month" :sparkline="[18, 24, 30]">
       <x-slot:icon><x-lucide-wallet /></x-slot:icon></x-nq::stat-card>
     KPI tile: label, a large tabular figure, the change since the last period with a good/bad tone, and an optional trend line. The tone is
     colour plus the trend arrow and sign. value: a number (formatted with format: style, currency, compact, minFraction, maxFraction, as on
     <x-nq::numeric>) or use the default slot. delta: fraction, 0.124 is +12.4%. invert: cost-style metric (down is good). loading: skeleton. --}}
@props(['label' => null, 'value' => null, 'format' => [], 'delta' => null, 'deltaFormat' => [], 'deltaLabel' => null, 'invert' => false, 'sparkline' => null, 'sparklineLabel' => null, 'loading' => false, 'icon' => null, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $trend = $delta === null || (float) $delta === 0.0 ? 'flat' : ($delta > 0 ? 'up' : 'down');
    $tone = $trend === 'flat' ? 'neutral' : (($trend === 'up') !== (bool) $invert ? 'positive' : 'negative');
    $toneText = ['positive' => 'text-nq-success-text', 'negative' => 'text-nq-danger-text', 'neutral' => 'text-muted-foreground'][$tone];
    $toneColor = ['positive' => 'var(--nq-success)', 'negative' => 'var(--nq-danger)', 'neutral' => 'var(--primary)'][$tone];
    $trendIcon = ['up' => 'lucide-trending-up', 'down' => 'lucide-trending-down', 'flat' => 'lucide-minus'][$trend];
    $deltaText = null;
    if ($delta !== null) {
        $max = $deltaFormat['maxFraction'] ?? 1;
        if (class_exists(\NumberFormatter::class)) {
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::PERCENT);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $max);
            if (isset($deltaFormat['minFraction'])) {
                $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, (int) $deltaFormat['minFraction']);
            }
            $deltaText = $f->format($delta);
        } else {
            $deltaText = round($delta * 100, (int) $max).'%';
        }
        // An explicit sign for any change: "+12.4%" (a negative number already carries its own sign).
        if ($delta > 0 && ! str_starts_with($deltaText, '+')) {
            $deltaText = '+'.$deltaText;
        }
    }
@endphp
<div data-slot="stat-card" @if ($delta !== null) data-trend="{{ $trend }}" data-tone="{{ $tone }}" @endif @if ($loading) aria-busy="true" @endif {{ $attributes->cn('flex flex-col gap-3 rounded-card border border-border bg-card px-4 py-4 text-card-foreground') }}>
    @if ($loading)
        <div data-slot="stat-card-skeleton" class="flex flex-col gap-3">
            <x-nq::states.skeleton class="h-3.5 w-24" />
            <x-nq::states.skeleton class="h-8 w-32" />
            <x-nq::states.skeleton class="h-3.5 w-20" />
        </div>
    @else
        <div class="flex items-center gap-2">
            @if ($icon && ! $icon->isEmpty())
                <span data-slot="stat-card-icon" aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4">{{ $icon }}</span>
            @endif
            <div data-slot="stat-card-label" class="min-w-0 truncate text-body-sm text-muted-foreground">{{ $label }}</div>
        </div>
        <div class="flex items-end justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
                <div data-slot="stat-card-value" class="text-h2 leading-tight text-foreground tabular-nums">
                    @if ($value !== null)
                        <x-nq::numeric :value="$value" :style="$format['style'] ?? 'decimal'" :currency="$format['currency'] ?? null" :compact="$format['compact'] ?? false" :min-fraction="$format['minFraction'] ?? null" :max-fraction="$format['maxFraction'] ?? null" :locale="$locale" />
                    @else
                        {{ $slot }}
                    @endif
                </div>
                @if ($delta !== null)
                    <div data-slot="stat-card-delta" class="flex flex-wrap items-center gap-x-1.5 text-caption">
                        <span class="inline-flex items-center gap-1 text-label {{ $toneText }}">
                            <x-dynamic-component :component="$trendIcon" aria-hidden="true" class="size-3.5 shrink-0 rtl:-scale-x-100" />
                            <bdi data-slot="num" data-numeric="" class="tabular-nums">{{ $deltaText }}</bdi>
                        </span>
                        @if ($deltaLabel)<span class="text-muted-foreground">{{ $deltaLabel }}</span>@endif
                    </div>
                @endif
            </div>
            @if ($sparkline)
                <x-nq::chart.sparkline :data="$sparkline" :color="$toneColor" :label="$sparklineLabel" class="w-24" />
            @endif
        </div>
    @endif
</div>

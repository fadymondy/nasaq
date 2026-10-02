{{-- <x-nq::chart.tooltip :config="$config" label="Feb" :payload="[['dataKey' => 'revenue', 'value' => 30500]]" :value-format="['style' => 'currency', 'currency' => 'USD', 'maximumFractionDigits' => 0]" />
     Tooltip card: heading, then one row per series with a colour key, its label and a tabular figure. Static markup for a known point;
     a chart library draws its own hover tooltip. active (default true), hide-label, value-format: Intl options (style, currency, maximumFractionDigits). --}}
@props(['config' => [], 'payload' => [], 'label' => null, 'valueFormat' => null, 'hideLabel' => false, 'active' => true])
@php
    $locale = app()->getLocale();
    $format = function (mixed $raw) use ($valueFormat, $locale): string {
        if (! is_numeric($raw) || ! class_exists(\NumberFormatter::class)) {
            return (string) $raw;
        }
        $f = (array) ($valueFormat ?? []);
        $style = $f['style'] ?? 'decimal';
        $nf = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', match ($style) {
            'percent' => \NumberFormatter::PERCENT,
            'currency' => \NumberFormatter::CURRENCY,
            default => \NumberFormatter::DECIMAL,
        });
        if (isset($f['maximumFractionDigits'])) {
            $nf->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $f['maximumFractionDigits']);
        }
        if (isset($f['minimumFractionDigits'])) {
            $nf->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, (int) $f['minimumFractionDigits']);
        }

        return $style === 'currency' ? $nf->formatCurrency($raw + 0, strtoupper($f['currency'] ?? \Nasaq\Nasaq::currency($locale))) : $nf->format($raw + 0);
    };
    $heading = $label !== null ? ($config[(string) $label]['label'] ?? $label) : null;
@endphp
@if ($active && count($payload))
    <div data-slot="{{ $attributes->get('data-slot', 'chart-tooltip') }}" dir="{{ \Nasaq\Nasaq::rtl() ? 'rtl' : 'ltr' }}"
        {{ $attributes->except('data-slot')->cn('grid min-w-32 gap-1.5 rounded-control border border-border bg-popover px-2.5 py-1.5 text-caption text-popover-foreground shadow-md') }}>
        @if (! $hideLabel && $heading !== null && $heading !== '')<div class="text-label">{{ $heading }}</div>@endif
        <div class="grid gap-1">
            @foreach ($payload as $item)
                @php
                    $key = (string) ($item['dataKey'] ?? $item['name'] ?? '');
                    $series = $config[$key] ?? (isset($item['name']) ? ($config[(string) $item['name']] ?? null) : null);
                    $color = $item['payload']['fill'] ?? $item['color'] ?? $item['fill'] ?? 'var(--color-'.$key.')';
                    $raw = is_array($item['value'] ?? null) ? end($item['value']) : ($item['value'] ?? '');
                @endphp
                <div class="flex items-center gap-2">
                    <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" style="background-color: {{ $color }}"></span>
                    <span class="text-muted-foreground">{{ $series['label'] ?? ($item['name'] ?? '') }}</span>
                    <span class="ms-auto ps-3 text-label tabular-nums">{{ $format($raw) }}</span>
                </div>
            @endforeach
        </div>
    </div>
@endif

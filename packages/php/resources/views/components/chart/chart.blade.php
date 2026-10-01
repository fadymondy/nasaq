{{-- <x-nq::chart :config="['revenue' => ['label' => 'Revenue'], 'cost' => ['label' => 'Cost', 'color' => 'var(--nq-tag-amber)']]" label="Revenue and cost">
     Sizes a chart to its box (16:9 by default; pass class="h-64" or aspect-* to change it), defines --color-<key> for every series in config
     and themes the chart's axes, grid and cursor with tokens. React wraps Recharts; Blade ships no chart library: put your plot
     (Chart.js, ApexCharts, ECharts, an SVG) in the slot and colour it with var(--color-<key>). config: key => ['label' => ..., 'color' => ...].
     label: accessible name; a chart is an image to a screen reader, so summarise it. --}}
@props(['config' => [], 'label' => null])
@php
    $palette = ['var(--primary)', 'var(--nq-tag-blue)', 'var(--nq-tag-teal)', 'var(--nq-tag-amber)', 'var(--nq-tag-violet)', 'var(--nq-tag-pink)', 'var(--nq-tag-orange)', 'var(--nq-tag-green)'];
    $vars = [];
    $i = 0;
    foreach ($config as $key => $series) {
        $vars[] = '--color-'.$key.': '.($series['color'] ?? $palette[$i % count($palette)]);
        $i++;
    }
@endphp
<div data-slot="chart" @if ($label) role="img" aria-label="{{ $label }}" @endif @if ($vars) style="{{ implode('; ', $vars) }}" @endif
    {{ $attributes->cn([
        'flex aspect-video w-full justify-center text-caption',
        '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
        '[&_.recharts-cartesian-grid_line]:stroke-border',
        '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted',
        '[&_.recharts-dot]:stroke-card [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden',
        '[&_.recharts-sector]:stroke-card [&_.recharts-surface]:outline-hidden',
    ]) }}>
    {{ $slot }}
</div>

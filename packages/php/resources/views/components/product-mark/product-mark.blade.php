{{-- <x-nq::product-mark brand="mahaam" :size="32" />
     A brand's cube-lattice mark, drawn from its spec. Never recoloured, filtered, mirrored or transformed; the dark variant is the spec's own on-dark body.
     brand: a brand key or legacy alias (default nasaq). size: px. title: accessible name (default the brand name; "" hides it when a name sits beside it).
     on-dark: force the dark (true) or light (false) body; by default marks that have a dark body switch with the dark: variant.
     src / logo-url: a custom logo image shown instead of the mark; if it fails to load the mark is drawn (needs the Alpine runtime). --}}
@props(['brand' => null, 'size' => 24, 'title' => null, 'onDark' => null, 'src' => null, 'logoUrl' => null])
@php
    $marks = [
        'nasaq' => ['Nasaq', [[1, 0], [5, 0], [2, 1], [4, 1], [3, 2]], [[3, 2]], '#15694A', '#4CC495', '#C9A227'],
        'fadymondy' => ['Fady Mondy', [[1, 0], [3, 0], [0, 1], [2, 1], [1, 2], [3, 2], [0, 3], [2, 3]], [[3, 0]], '#0E1A3C', '#F0EBE1', '#C9A227'],
        'mahaam' => ['Mahaam', [[1, 0], [3, 0], [0, 1], [2, 1]], [[3, 0]], '#8C3FB5', null, '#C9A227'],
        'zekra' => ['Zekra', [[3, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2], [2, 3], [4, 3]], [[3, 0]], '#6D4DE6', null, '#C9A227'],
        'moharrik' => ['Moharrik', [[1, 0], [3, 0], [0, 1], [4, 1], [1, 2], [3, 2], [2, 3]], [[3, 0]], '#00A0A8', null, '#C9A227'],
        'seatfor' => ['SeatFor', [[1, 0], [3, 0], [5, 0], [2, 1], [4, 1], [1, 2], [3, 2], [5, 2]], [[4, 1]], '#B8479B', null, '#C9A227'],
        'health-debug' => ['Health Debug', [[1, 0], [3, 0], [0, 1], [2, 1], [4, 1], [1, 2], [3, 2], [2, 3]], [[3, 0]], '#B0243F', null, '#C9A227'],
        'circlexo' => ['CircleXO', [[3, 0], [2, 1], [4, 1], [1, 2], [5, 2], [2, 3], [4, 3], [3, 4]], [[3, 0]], '#6FA8D6', null, '#C9A227'],
        'hosbah' => ['Hosbah', [[1, 0], [3, 0], [2, 1], [1, 2], [3, 2], [2, 3], [1, 4], [3, 4]], [[3, 0]], '#2E6F9E', null, '#C9A227'],
        'orchestra' => ['Orchestra', [[3, 2], [4, 3], [5, 2], [6, 1]], [[6, 1]], '#D97757', null, '#8C3B1F'],
        'togo' => ['ToGO', [[0, 1], [1, 0], [1, 2], [2, 1], [2, 3], [3, 2]], [[2, 1], [2, 3], [3, 2]], '#0E1A3C', '#F0EBE1', '#1F8A99'],
    ];
    $aliases = ['managy' => 'mahaam', 'cabrain' => 'zekra', 'claude-digital-twin' => 'moharrik', 'booki' => 'seatfor', 'cloudy' => 'hosbah', 'orchestra-mcp' => 'orchestra', 'fady-mondy' => 'fadymondy', 'togo-framework' => 'togo'];
    $key = $brand ?: (config('nasaq.brand') ?: 'nasaq');
    $key = isset($marks[$key]) ? $key : ($aliases[$key] ?? null);
    [$name, $cells, $accentCells, $body, $bodyOnDark, $accent] = $marks[$key ?? 'nasaq'];

    $label = $title ?? $name;
    $custom = $src ?? $logoUrl;
    $showAccent = $size >= 20;
    $cols = array_column($cells, 0);
    $rows = array_column($cells, 1);
    $width = max($cols) - min($cols) + 1;
    $height = max($rows) - min($rows) + 1;
    $unit = 100 / max($width, $height);
    $x0 = (100 - $width * $unit) / 2;
    $y0 = (100 - $height * $unit) / 2;
    $accentSet = array_map(fn ($c) => $c[0].','.$c[1], $accentCells);
    $rects = array_map(fn ($c) => [
        'x' => round($x0 + ($c[0] - min($cols)) * $unit, 3),
        'y' => round($y0 + ($c[1] - min($rows)) * $unit, 3),
        'accent' => in_array($c[0].','.$c[1], $accentSet, true),
    ], $cells);
    $unit = round($unit, 3);
    // Light body, and the dark body when the mark has one. null on-dark means: follow the dark: variant.
    $light = $onDark === true ? ($bodyOnDark ?? $body) : $body;
    $dark = $onDark === false ? $body : ($bodyOnDark ?? $body);
    $dual = $onDark === null && $dark !== $light;
@endphp
@if ($custom)
    <span class="contents" x-data="{ failed: false }">
        <img data-slot="product-mark" data-custom="" src="{{ $custom }}" alt="{{ $label }}" width="{{ $size }}" height="{{ $size }}" draggable="false" x-show="!failed" x-on:error="failed = true" {{ $attributes->cn('shrink-0 object-contain') }}>
@endif
<svg data-slot="product-mark" viewBox="0 0 100 100" width="{{ $size }}" height="{{ $size }}" @if ($label !== '') role="img" aria-label="{{ $label }}" @else aria-hidden="true" @endif shape-rendering="crispEdges" @if ($custom) x-show="failed" style="display: none" @endif {{ $attributes->cn('shrink-0') }}>
    @if ($dual)
        <g class="dark:hidden">
            @foreach ($rects as $r)
                <rect x="{{ $r['x'] }}" y="{{ $r['y'] }}" width="{{ $unit }}" height="{{ $unit }}" fill="{{ $r['accent'] && $showAccent ? $accent : $light }}" />
            @endforeach
        </g>
        <g class="hidden dark:block">
            @foreach ($rects as $r)
                <rect x="{{ $r['x'] }}" y="{{ $r['y'] }}" width="{{ $unit }}" height="{{ $unit }}" fill="{{ $r['accent'] && $showAccent ? $accent : $dark }}" />
            @endforeach
        </g>
    @else
        @foreach ($rects as $r)
            <rect x="{{ $r['x'] }}" y="{{ $r['y'] }}" width="{{ $unit }}" height="{{ $unit }}" fill="{{ $r['accent'] && $showAccent ? $accent : $light }}" />
        @endforeach
    @endif
</svg>
@if ($custom)
    </span>
@endif

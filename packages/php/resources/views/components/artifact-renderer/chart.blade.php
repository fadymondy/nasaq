{{-- Internal: the chart kind. React draws it with Recharts; here it is hand-drawn SVG (bars, lines, areas, pie, donut), computed on the server.
     Series keys come from the agent, so they are mapped to s0, s1... (slices to p0, p1...) before they become CSS variable names. --}}
@include('nasaq::components.artifact-renderer._logic')
@props(['artifact', 'words', 'locale'])
@php
    $tx = fn ($v) => nq_art_localize($v, $locale);
    $rtl = str_starts_with($locale, 'ar');
    $kind = $artifact['chart'] ?? 'bar';
    $isPie = in_array($kind, ['pie', 'donut'], true);
    $title = $tx($artifact['title'] ?? null);
    $label = $title !== '' ? sprintf($words['chartTitled'], $title) : $words['chart'];
    $cartesian = null;
    $pie = null;
    $config = [];
    if ($isPie) {
        $slices = nq_art_pie_slices($artifact);
        $names = array_map(fn ($s) => ($s['other'] ?? false) ? $words['other'] : $s['name'], $slices);
        foreach ($names as $i => $n) {
            $config["p$i"] = ['label' => $n];
        }
        $pie = nq_art_pie($slices, $kind === 'donut', $names, $locale);
    } else {
        $keys = [];
        $labels = [];
        foreach ($artifact['series'] as $i => $s) {
            $keys[] = "s$i";
            $labels[] = $tx($s['label']);
            $config["s$i"] = ['label' => $labels[$i]] + (isset($s['color']) ? ['color' => $s['color']] : []);
        }
        $data = [];
        foreach ($artifact['data'] as $row) {
            $r = ['x' => $row[$artifact['xKey']]];
            foreach ($artifact['series'] as $i => $s) {
                $r["s$i"] = $row[$s['key']];
            }
            $data[] = $r;
        }
        $cartesian = nq_art_cartesian($kind, $keys, $data, $rtl, $locale, $labels);
    }
    $legend = array_map(fn ($k) => ['dataKey' => $k, 'color' => "var(--color-$k)"], array_keys($config));
    $showLegend = $isPie || count($config) > 1;
@endphp
<x-nq::chart :config="$config" :label="$label" :class="$isPie ? 'aspect-auto h-64 w-full flex-col' : 'aspect-auto h-56 w-full flex-col'">
    @if ($cartesian)
        <svg viewBox="0 0 {{ $cartesian['width'] }} {{ $cartesian['height'] }}" class="min-h-0 w-full flex-1" aria-hidden="true" focusable="false">
            @foreach ($cartesian['grid'] as $g)<line x1="{{ $g['x1'] }}" x2="{{ $g['x2'] }}" y1="{{ $g['y'] }}" y2="{{ $g['y'] }}" class="stroke-border" stroke-width="1" />@endforeach
            @foreach ($cartesian['yTicks'] as $y)<text x="{{ $y['x'] }}" y="{{ $y['y'] }}" text-anchor="{{ $y['anchor'] }}" font-size="12" class="fill-muted-foreground">{{ $y['text'] }}</text>@endforeach
            @foreach ($cartesian['xTicks'] as $x)<text x="{{ $x['x'] }}" y="{{ $x['y'] }}" text-anchor="middle" font-size="12" class="fill-muted-foreground">{{ $x['text'] }}</text>@endforeach
            @foreach ($cartesian['areas'] as $a)<path d="{{ $a['d'] }}" fill="var(--color-{{ $a['key'] }})" fill-opacity="0.15" stroke="none" />@endforeach
            @foreach ($cartesian['bars'] as $b)<path d="{{ $b['d'] }}" fill="var(--color-{{ $b['key'] }})" />@endforeach
            @foreach ($cartesian['lines'] as $l)<path d="{{ $l['d'] }}" fill="none" stroke="var(--color-{{ $l['key'] }})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />@endforeach
            @foreach ($cartesian['bands'] as $b)<rect x="{{ $b['x'] }}" width="{{ $b['width'] }}" y="0" height="{{ $cartesian['height'] }}" fill="transparent"><title>{{ $b['title'] }}</title></rect>@endforeach
        </svg>
    @elseif ($pie)
        <svg viewBox="0 0 {{ $pie['width'] }} {{ $pie['height'] }}" class="min-h-0 w-full flex-1" aria-hidden="true" focusable="false">
            @foreach ($pie['slices'] as $s)<path d="{{ $s['d'] }}" fill="var(--color-{{ $s['key'] }})" stroke="var(--card)" stroke-width="2"><title>{{ $s['title'] }}</title></path>@endforeach
        </svg>
    @endif
    @if ($showLegend)<x-nq::chart.legend :config="$config" :payload="$legend" />@endif
</x-nq::chart>

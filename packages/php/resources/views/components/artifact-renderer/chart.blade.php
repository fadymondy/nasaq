{{-- Internal: the chart kind. React draws it with Recharts; here it is hand-drawn SVG (bars, lines, areas, pie, donut), computed on the server.
     Hover shows the styled chart tooltip (Alpine, nqArtifactChart) like the other ported charts.
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
        <div class="relative min-h-0 w-full flex-1" data-slot="artifact-chart-plot" x-data="nqArtifactChart(@js(array_column($cartesian['bands'], 'tip')))" x-on:pointermove="move($event)" x-on:pointerleave="leave()">
        <svg viewBox="0 0 {{ $cartesian['width'] }} {{ $cartesian['height'] }}" class="size-full" aria-hidden="true" focusable="false">
            @foreach ($cartesian['grid'] as $g)<line x1="{{ $g['x1'] }}" x2="{{ $g['x2'] }}" y1="{{ $g['y'] }}" y2="{{ $g['y'] }}" class="stroke-border" stroke-width="1" />@endforeach
            @foreach ($cartesian['yTicks'] as $y)<text x="{{ $y['x'] }}" y="{{ $y['y'] }}" text-anchor="{{ $y['anchor'] }}" font-size="12" class="fill-muted-foreground">{{ $y['text'] }}</text>@endforeach
            @foreach ($cartesian['xTicks'] as $x)<text x="{{ $x['x'] }}" y="{{ $x['y'] }}" text-anchor="middle" font-size="12" class="fill-muted-foreground">{{ $x['text'] }}</text>@endforeach
            @foreach ($cartesian['areas'] as $a)<path d="{{ $a['d'] }}" fill="var(--color-{{ $a['key'] }})" fill-opacity="0.15" stroke="none" />@endforeach
            @foreach ($cartesian['bars'] as $b)<path d="{{ $b['d'] }}" fill="var(--color-{{ $b['key'] }})" />@endforeach
            @foreach ($cartesian['lines'] as $l)<path d="{{ $l['d'] }}" fill="none" stroke="var(--color-{{ $l['key'] }})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />@endforeach
            @foreach ($cartesian['bands'] as $b)<rect x="{{ $b['x'] }}" width="{{ $b['width'] }}" y="0" height="{{ $cartesian['height'] }}" fill="transparent" data-tip="{{ $loop->index }}" x-on:pointerenter="show({{ $loop->index }})" />@endforeach
        </svg>
        <div class="contents" style="display: none" x-show="hover !== null"><div class="pointer-events-none absolute z-10" x-bind:style="tipStyle">
            <div data-slot="chart-tooltip" dir="{{ $rtl ? 'rtl' : 'ltr' }}" class="grid min-w-32 gap-1.5 rounded-control border border-border bg-popover px-2.5 py-1.5 text-caption text-popover-foreground shadow-md">
                <div class="text-label" x-show="tip.heading" x-text="tip.heading"></div>
                <div class="grid gap-1">
                    <template x-for="(row, r) in tip.rows" x-bind:key="r">
                        <div class="flex items-center gap-2">
                            <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" x-bind:style="{ backgroundColor: row.color }"></span>
                            <span class="text-muted-foreground" x-text="row.label"></span>
                            <span class="ms-auto ps-3 text-label tabular-nums" x-text="row.text"></span>
                        </div>
                    </template>
                </div>
            </div>
        </div></div>
        </div>
    @elseif ($pie)
        <div class="relative min-h-0 w-full flex-1" data-slot="artifact-chart-plot" x-data="nqArtifactChart(@js(array_column($pie['slices'], 'tip')))" x-on:pointermove="move($event)" x-on:pointerleave="leave()">
        <svg viewBox="0 0 {{ $pie['width'] }} {{ $pie['height'] }}" class="size-full" aria-hidden="true" focusable="false">
            @foreach ($pie['slices'] as $s)<path d="{{ $s['d'] }}" fill="var(--color-{{ $s['key'] }})" stroke="var(--card)" stroke-width="2" data-tip="{{ $loop->index }}" x-on:pointerenter="show({{ $loop->index }})" />@endforeach
        </svg>
        <div class="contents" style="display: none" x-show="hover !== null"><div class="pointer-events-none absolute z-10" x-bind:style="tipStyle">
            <div data-slot="chart-tooltip" dir="{{ $rtl ? 'rtl' : 'ltr' }}" class="grid min-w-32 gap-1.5 rounded-control border border-border bg-popover px-2.5 py-1.5 text-caption text-popover-foreground shadow-md">
                <div class="text-label" x-show="tip.heading" x-text="tip.heading"></div>
                <div class="grid gap-1">
                    <template x-for="(row, r) in tip.rows" x-bind:key="r">
                        <div class="flex items-center gap-2">
                            <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" x-bind:style="{ backgroundColor: row.color }"></span>
                            <span class="text-muted-foreground" x-text="row.label"></span>
                            <span class="ms-auto ps-3 text-label tabular-nums" x-text="row.text"></span>
                        </div>
                    </template>
                </div>
            </div>
        </div></div>
        </div>
    @endif
    @if ($showLegend)<x-nq::chart.legend :config="$config" :payload="$legend" />@endif
</x-nq::chart>

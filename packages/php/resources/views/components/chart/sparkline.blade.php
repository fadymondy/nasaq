{{-- <x-nq::chart.sparkline :data="[18600, 30500, 23700]" label="Revenue, January to March" class="h-24 w-full" />
     Axis-less trend line for table cells and cards. Sized by its box (default 8rem x 2rem); time runs right to left in RTL. No tooltip:
     put the figure next to it. Plain SVG, no chart library. data: numbers or ['value' => n]. color: any CSS colour (default the brand colour).
     label: screen-reader summary, e.g. "Revenue, last 12 weeks, up 12%"; without it the chart is hidden from assistive tech. fill: area under the line (default true). --}}
@props(['data' => [], 'color' => 'var(--primary)', 'label' => null, 'fill' => true])
@php
    $vals = array_map(fn ($d) => is_array($d) ? $d['value'] : $d, array_values($data));
    $f = fn (float $v) => rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.');
    // Monotone cubic (Fritsch-Carlson) path, the same curve Recharts draws for type="monotone".
    $monotone = function (array $pts) use ($f): string {
        $n = count($pts);
        if ($n === 0) {
            return '';
        }
        if ($n === 1) {
            return 'M'.$f($pts[0][0]).','.$f($pts[0][1]);
        }
        $dx = [];
        $slope = [];
        for ($i = 0; $i < $n - 1; $i++) {
            $dx[$i] = $pts[$i + 1][0] - $pts[$i][0];
            $slope[$i] = $dx[$i] == 0 ? 0 : ($pts[$i + 1][1] - $pts[$i][1]) / $dx[$i];
        }
        $m = [$slope[0]];
        for ($i = 1; $i < $n - 1; $i++) {
            $m[$i] = $slope[$i - 1] * $slope[$i] <= 0 ? 0 : ($slope[$i - 1] + $slope[$i]) / 2;
        }
        $m[$n - 1] = $slope[$n - 2];
        for ($i = 0; $i < $n - 1; $i++) {
            if ($slope[$i] == 0) {
                $m[$i] = 0;
                $m[$i + 1] = 0;

                continue;
            }
            $a = $m[$i] / $slope[$i];
            $b = $m[$i + 1] / $slope[$i];
            $s = $a * $a + $b * $b;
            if ($s > 9) {
                $t = 3 / sqrt($s);
                $m[$i] = $t * $a * $slope[$i];
                $m[$i + 1] = $t * $b * $slope[$i];
            }
        }
        $d = 'M'.$f($pts[0][0]).','.$f($pts[0][1]);
        for ($i = 0; $i < $n - 1; $i++) {
            [$x0, $y0] = $pts[$i];
            [$x1, $y1] = $pts[$i + 1];
            $h = $dx[$i] / 3;
            $d .= 'C'.$f($x0 + $h).','.$f($y0 + $m[$i] * $h).','.$f($x1 - $h).','.$f($y1 - $m[$i + 1] * $h).','.$f($x1).','.$f($y1);
        }

        return $d;
    };
    $w = 128; $h = 32; $pad = 2;
    $line = ''; $area = '';
    if ($vals) {
        $max = max(0, ...$vals);
        $min = min(0, ...$vals);
        $span = ($max - $min) ?: 1;
        $innerW = $w - $pad * 2;
        $innerH = $h - $pad * 2;
        $count = count($vals);
        $pts = [];
        foreach ($vals as $i => $v) {
            $pts[] = [$pad + ($count === 1 ? $innerW / 2 : ($i / ($count - 1)) * $innerW), $pad + $innerH - (($v - $min) / $span) * $innerH];
        }
        $line = $monotone($pts);
        $base = $pad + $innerH - ((0 - $min) / $span) * $innerH;
        $last = $pts[$count - 1];
        $area = $line.'L'.number_format($last[0], 2, '.', '').','.number_format($base, 2, '.', '').'L'.number_format($pts[0][0], 2, '.', '').','.number_format($base, 2, '.', '').'Z';
    }
    $gid = 'nq-spark-'.substr(md5(json_encode([$vals, $color])), 0, 8);
@endphp
<div data-slot="sparkline" @if ($label) role="img" aria-label="{{ $label }}" @else aria-hidden="true" @endif {{ $attributes->cn('h-8 w-32 shrink-0') }}>
    <svg viewBox="0 0 128 32" preserveAspectRatio="none" class="size-full overflow-visible rtl:-scale-x-100" aria-hidden="true" focusable="false">
        <defs>
            <linearGradient id="{{ $gid }}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="{{ $color }}" stop-opacity="0.3" />
                <stop offset="100%" stop-color="{{ $color }}" stop-opacity="0" />
            </linearGradient>
        </defs>
        @if ($fill)<path d="{{ $area }}" fill="url(#{{ $gid }})" stroke="none" />@endif
        <path d="{{ $line }}" fill="none" stroke="{{ $color }}" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
</div>

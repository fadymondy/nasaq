{{-- <x-nq::auth-layout.emblem :size="112" />
     The product mark inside rings of lattice cubes coloured from the brand tokens; the mark turns into a lock after the entrance.
     size: px (default 112). lock: false keeps the mark (default true). busy: scan the rings. Default slot replaces the mark. Decorative. --}}
@props(['size' => 112, 'lock' => true, 'busy' => false])
@php
    $rings = [['r' => 31, 'count' => 18, 'size' => 4.2, 'fade' => 1], ['r' => 39, 'count' => 24, 'size' => 3.6, 'fade' => 0.85], ['r' => 47, 'count' => 30, 'size' => 3, 'fade' => 0.65], ['r' => 55, 'count' => 36, 'size' => 2.4, 'fade' => 0.45]];
    $stops = ['var(--nq-action)', 'var(--nq-brand-l)', 'var(--nq-accent)', 'var(--nq-brand)', 'var(--nq-action)'];
    $colour = function (float $t) use ($stops) {
        $span = $t * (count($stops) - 1);
        $i = min((int) floor($span), count($stops) - 2);
        $mix = round(($span - $i) * 100);
        return "color-mix(in oklab, {$stops[$i + 1]} {$mix}%, {$stops[$i]})";
    };
    $core = (int) round($size * 0.3);
    $fmt = fn (float $n) => rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.') ?: '0';
    $hasMark = isset($slot) && ! $slot->isEmpty();
@endphp
<div data-slot="auth-emblem" @if ($busy) data-busy="true" @endif aria-hidden="true" style="width: {{ $size }}px; height: {{ $size }}px"
    {{ $attributes->cn('relative grid shrink-0 place-items-center') }}>
    <svg viewBox="-60 -60 120 120" width="{{ $size }}" height="{{ $size }}" class="absolute inset-0 overflow-visible">
        @foreach ($rings as $ri => $ring)
            <g data-emblem-ring="{{ $ri }}">
                @for ($i = 0; $i < $ring['count']; $i++)
                    @php
                        $t = ($i + ($ri % 2 ? 0.5 : 0)) / $ring['count'];
                        $angle = $t * 360 - 90;
                        $rad = deg2rad($angle);
                        $s = $ring['size'];
                    @endphp
                    <g transform="translate({{ $fmt(cos($rad) * $ring['r']) }} {{ $fmt(sin($rad) * $ring['r']) }}) rotate({{ number_format($angle + 45, 1, '.', '') }})">
                        <rect data-emblem-cell x="{{ $fmt(-$s / 2) }}" y="{{ $fmt(-$s / 2) }}" width="{{ $s }}" height="{{ $s }}" rx="{{ $fmt($s * 0.22) }}"
                            style="fill: {{ $colour($t) }}; opacity: {{ $ring['fade'] }}; --nq-emblem-t: {{ $fmt($t) }}; --nq-emblem-ring: {{ $ri }}"></rect>
                    </g>
                @endfor
            </g>
        @endforeach
    </svg>
    <span data-emblem-core @if ($lock) data-lock @endif class="relative grid place-items-center *:col-start-1 *:row-start-1">
        <span data-emblem-mark class="grid place-items-center">
            @if ($hasMark) {{ $slot }} @else <x-nq::product-mark :size="$core" /> @endif
        </span>
        @if ($lock)
            <svg data-emblem-lock viewBox="0 0 24 24" width="{{ $core }}" height="{{ $core }}" class="overflow-visible">
                <path data-emblem-shackle d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="var(--nq-action)" stroke-width="2.4" stroke-linecap="round" />
                <rect x="4" y="10.5" width="16" height="11.5" rx="3" fill="var(--nq-action)" />
                <path d="M12 14.6v3" stroke="var(--nq-on-action)" stroke-width="2.2" stroke-linecap="round" />
            </svg>
        @endif
    </span>
</div>

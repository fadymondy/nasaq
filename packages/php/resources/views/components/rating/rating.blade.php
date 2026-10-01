{{-- <x-nq::rating :value="4.8" :count="2140" count-label="workspaces" />
     A single star, the average and an optional count: "★ 4.8 · 2.1K workspaces". value: the score. max: top of the scale (5).
     count: how many rated it, shown compact (2.1K). count-label: what count counts; localise it. --}}
@props(['value', 'max' => 5, 'count' => null, 'countLabel' => null])
@php
    $locale = app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $score = class_exists(\NumberFormatter::class)
        ? (function () use ($value, $locale) {
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL);
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, 1);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, 1);

            return $f->format($value);
        })()
        : number_format($value, 1);
    $total = '';
    if ($count !== null) {
        $abs = abs($count);
        [$div, $suffix] = $abs >= 1e12 ? [1e12, 'T'] : ($abs >= 1e9 ? [1e9, 'B'] : ($abs >= 1e6 ? [1e6, 'M'] : ($abs >= 1e3 ? [1e3, 'K'] : [1, ''])));
        $scaled = $count / $div;
        $total = rtrim(rtrim(number_format($abs >= 1e3 && abs($scaled) < 10 ? round($scaled, 1) : round($scaled), 1, '.', ''), '0'), '.').$suffix;
    }
    $spoken = $ar
        ? 'التقييم '.$score.' من '.$max.($count === null ? '' : '، '.$total.' '.($countLabel ?? ''))
        : 'Rated '.$score.' out of '.$max.($count === null ? '' : ', '.$total.' '.($countLabel ?? ''));
@endphp
<span data-slot="rating" {{ $attributes->cn('inline-flex items-center gap-1.5 text-caption text-muted-foreground') }}>
    <span class="sr-only">{{ trim($spoken) }}</span>
    <x-lucide-star aria-hidden="true" class="size-3.5 shrink-0 fill-nq-accent text-nq-accent" />
    <bdi aria-hidden="true" class="tabular-nums text-foreground">{{ $score }}</bdi>
    @if ($count !== null)
        <span aria-hidden="true" class="truncate">
            <span class="me-1.5">·</span>
            <bdi class="tabular-nums">{{ $total }}</bdi>{{ $countLabel ? ' '.$countLabel : '' }}
        </span>
    @endif
</span>

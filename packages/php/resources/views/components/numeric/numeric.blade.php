{{-- <x-nq::numeric :value="48210.5" style="currency" currency="SAR" />
     A formatted figure: tabular digits and bidi isolation, Latin digits also in Arabic.
     style: decimal | percent | currency. currency: ISO code (style=currency; USD, or SAR in Arabic, when omitted).
     compact: 48.2K. min-fraction / max-fraction: decimals. For dates use <x-nq::numeric.date-time>. --}}
@props(['value', 'style' => 'decimal', 'currency' => null, 'compact' => false, 'minFraction' => null, 'maxFraction' => null, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $tag = str_replace('_', '-', $locale).'@numbers=latn';
    $text = null;
    if (class_exists(\NumberFormatter::class)) {
        $type = match ($style) {
            'percent' => \NumberFormatter::PERCENT,
            'currency' => \NumberFormatter::CURRENCY,
            default => $compact ? \NumberFormatter::DECIMAL : \NumberFormatter::DECIMAL,
        };
        $f = new \NumberFormatter($tag, $type);
        if ($minFraction !== null) {
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, (int) $minFraction);
        }
        if ($maxFraction !== null) {
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $maxFraction);
        }
        if ($compact && $style === 'decimal') {
            $abs = abs($value);
            [$div, $suffix] = $abs >= 1e12 ? [1e12, 'T'] : ($abs >= 1e9 ? [1e9, 'B'] : ($abs >= 1e6 ? [1e6, 'M'] : ($abs >= 1e3 ? [1e3, 'K'] : [1, ''])));
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $maxFraction ?? 1);
            $text = $f->format($value / $div).$suffix;
        } elseif ($style === 'currency') {
            $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
            $text = $f->formatCurrency($value, $code);
            $symbol = $f->getSymbol(\NumberFormatter::CURRENCY_SYMBOL);
            // A Latin symbol ("US$", "SAR") keeps its own order inside an RTL figure: wrap it in an LTR isolate.
            if (preg_match('/[A-Za-z]/', $symbol)) {
                $text = preg_replace('/'.preg_quote($symbol, '/').'/u', "\u{2066}".$symbol."\u{2069}", $text, 1);
            }
        } else {
            $text = $f->format($style === 'percent' ? $value : $value);
        }
    } else {
        $text = $style === 'currency' ? strtoupper($currency ?? \Nasaq\Nasaq::currency($locale)).' '.number_format($value, 2) : ($style === 'percent' ? round($value * 100).'%' : number_format($value, $maxFraction ?? (floor($value) == $value ? 0 : 2)));
    }
@endphp
<bdi data-slot="num" data-numeric="" {{ $attributes->cn('tabular-nums') }}>{{ $text }}</bdi>

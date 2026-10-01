{{-- <x-nq::numeric :value="48210.5" style="currency" currency="SAR" />
     A formatted figure: tabular digits and bidi isolation, Latin digits also in Arabic.
     style: decimal | percent | currency. currency: ISO code (style=currency; USD, or SAR in Arabic, when omitted).
     compact: 48K, 1.2K. min-fraction / max-fraction: decimals. For dates use <x-nq::numeric.date-time>. --}}
@props(['value', 'style' => 'decimal', 'currency' => null, 'compact' => false, 'minFraction' => null, 'maxFraction' => null, 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $tag = str_replace('_', '-', $locale).'@numbers=latn';
    $text = null;
    if (class_exists(\NumberFormatter::class)) {
        $type = match ($style) {
            'percent' => \NumberFormatter::PERCENT,
            'currency' => \NumberFormatter::CURRENCY,
            default => \NumberFormatter::DECIMAL,
        };
        $f = new \NumberFormatter($tag, $type);
        if ($minFraction !== null) {
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, (int) $minFraction);
        }
        if ($maxFraction !== null) {
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $maxFraction);
        }
        if ($compact) {
            // Same rounding as Intl's compact notation: 1.2K, 12K, 123K, and 999,950 becomes 1M rather than 1000K.
            $scale = function (float $v) use ($maxFraction): array {
                $units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
                [$div, $suffix] = [1, ''];
                foreach ($units as $u) {
                    if (abs($v) >= $u[0]) {
                        [$div, $suffix] = $u;
                        break;
                    }
                }
                $digits = $maxFraction ?? (abs($v / $div) < 10 ? 1 : 0);
                $n = round($v / $div, (int) $digits);
                if (abs($n) >= 1000 && $suffix !== 'T') {
                    [$div, $suffix] = $suffix === '' ? [1e3, 'K'] : ($suffix === 'K' ? [1e6, 'M'] : ($suffix === 'M' ? [1e9, 'B'] : [1e12, 'T']));
                    $digits = $maxFraction ?? 1;
                    $n = round($v / $div, (int) $digits);
                }

                return [$n, $suffix, (int) $digits];
            };
        }
        if ($compact && $style === 'decimal') {
            [$n, $suffix, $digits] = $scale((float) $value);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);
            $text = $f->format($n).$suffix;
        } elseif ($style === 'currency') {
            $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
            if ($compact) {
                // 48200 → $48K: format the scaled amount as currency, then put the suffix after the last digit.
                [$n, $suffix, $digits] = $scale((float) $value);
                $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, 0);
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);
                $text = preg_replace('/(\d)(?!.*\d)/u', '$1'.$suffix, $f->formatCurrency($n, $code), 1);
            } else {
                $text = $f->formatCurrency($value, $code);
            }
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

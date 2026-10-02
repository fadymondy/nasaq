{{-- <x-nq::price :amount="12" period="seat-month" />
     A price with its currency, billing period and optional struck-through original. amount 0 shows the free label.
     currency: ISO code (USD, or SAR in Arabic, when omitted). period: once | month | year | seat-month. compare-at: the price before a discount.
     free-label (default "Free" / "مجاني"). fraction-digits (default 0 for whole amounts, 2 otherwise). size: sm | md | lg. --}}
@props(['amount', 'currency' => null, 'period' => 'once', 'compareAt' => null, 'freeLabel' => null, 'fractionDigits' => null, 'size' => 'md'])
@php
    $locale = app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $sizes = [
        'sm' => ['root' => 'text-body-sm', 'amount' => 'font-medium'],
        'md' => ['root' => 'text-body', 'amount' => 'font-medium'],
        'lg' => ['root' => 'text-body-sm', 'amount' => 'text-h2 font-semibold tracking-tight'],
    ];
    $s = $sizes[$size] ?? $sizes['md'];
    $periods = ['month' => ['/mo', '/شهريًا'], 'year' => ['/yr', '/سنويًا'], 'seat-month' => ['/seat/mo', '/للمقعد شهريًا']];
    $money = function (float|int $value) use ($fractionDigits, $code, $locale): string {
        $digits = $fractionDigits !== null ? (int) $fractionDigits : (floor($value) == $value ? 0 : 2);
        if (! class_exists(\NumberFormatter::class)) {
            return $code.' '.number_format($value, $digits);
        }
        $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::CURRENCY);
        $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $digits);
        $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);
        $text = $f->formatCurrency($value, $code);
        $symbol = $f->getSymbol(\NumberFormatter::CURRENCY_SYMBOL);
        // A Latin symbol ("US$", "SAR") keeps its own order inside an RTL figure: wrap it in an LTR isolate.
        if (preg_match('/[A-Za-z]/', $symbol)) {
            $text = preg_replace('/'.preg_quote($symbol, '/').'/u', "\u{2066}".$symbol."\u{2069}", $text, 1);
        }

        return $text;
    };
@endphp
@if ($amount == 0)
    <span data-slot="{{ $attributes->get('data-slot', 'price') }}" data-free="" {{ $attributes->except('data-slot')->cn(['text-foreground', $s['root']]) }}>
        <span class="{{ $s['amount'] }}">{{ $freeLabel ?? ($ar ? 'مجاني' : 'Free') }}</span>
    </span>
@else
    <span data-slot="{{ $attributes->get('data-slot', 'price') }}" {{ $attributes->except('data-slot')->cn(['inline-flex flex-wrap items-baseline gap-x-1.5 text-foreground', $s['root']]) }}>
        <span>
            <bdi class="{{ \Nasaq\Cn::merge('tabular-nums', $s['amount']) }}">{{ $money($amount) }}</bdi>
            @if ($period !== 'once' && isset($periods[$period]))<span class="text-muted-foreground">{{ $periods[$period][$ar ? 1 : 0] }}</span>@endif
        </span>
        @if ($compareAt !== null && $compareAt > $amount)
            <s class="text-caption text-muted-foreground decoration-muted-foreground/60">
                <span class="sr-only">{{ $ar ? 'بدلًا من ' : 'was ' }}</span>
                <bdi class="tabular-nums">{{ $money($compareAt) }}</bdi>
            </s>
        @endif
    </span>
@endif

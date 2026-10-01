{{-- <x-nq::bundle-card title="Agency kit" description="…" includes="Mahaam · Zekra" :price="18" :compare-at="21"> <x-slot:items><x-nq::bundle-card.item><x-nq::product-artwork brand="mahaam" :mark-size="24" /></x-nq::bundle-card.item>…</x-slot:items> <x-slot:action><x-nq::button size="sm">Get the kit</x-nq::button></x-slot:action> </x-nq::bundle-card>
     Several apps sold together for less. Shows the stack, what it's for, the saving and the price against the separate total. Stacks vertically in a narrow container and lays out in a row from 36rem.
     items (slot): one <x-nq::bundle-card.item> per artwork or glyph, in order. title, description, includes and savings-label are attributes (or slots of the same name); action is a slot.
     price: the bundle price. compare-at: the same apps bought separately; the saving badge is compare-at minus price. currency: ISO code (USD, or SAR in Arabic, when omitted). period: once | month | year | seat-month (default month). --}}
@props(['title' => null, 'description' => null, 'includes' => null, 'price', 'compareAt', 'currency' => null, 'period' => 'month', 'savingsLabel' => null, 'items' => null, 'action' => null])
@php
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $locale = app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $saving = $compareAt - $price;
    $saved = (function () use ($saving, $code, $locale): string {
        $digits = floor($saving) == $saving ? 0 : 2;
        if (! class_exists(\NumberFormatter::class)) {
            return $code.' '.number_format($saving, $digits);
        }
        $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::CURRENCY);
        $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $digits);
        $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);

        return $f->formatCurrency($saving, $code);
    })();
@endphp
<div data-slot="bundle-card" class="@container">
    <article {{ $attributes->cn('flex flex-col gap-5 rounded-card bg-nq-surface p-5 @xl:flex-row @xl:items-center @xl:p-6') }}>
        <div aria-hidden="true" class="flex shrink-0 [&>*]:size-14 [&>*+*]:-ms-3">{{ $items }}</div>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-h3 text-foreground">{{ $title }}</h3>
                @if ($saving > 0)
                    <x-nq::badge variant="success">
                        @if ($has($savingsLabel)){{ $savingsLabel }}@else{{ $ar ? 'وفّر' : 'Save' }} <bdi class="tabular-nums">{{ $saved }}</bdi>@endif
                    </x-nq::badge>
                @endif
            </div>
            @if ($has($description))
                <p class="text-pretty text-body-sm text-muted-foreground">{{ $description }}</p>
            @endif
            @if ($has($includes))
                <p class="text-caption text-muted-foreground">{{ $includes }}</p>
            @endif
        </div>
        <div class="flex shrink-0 items-center justify-between gap-4 @xl:flex-col @xl:items-end">
            <x-nq::price :amount="$price" :compare-at="$compareAt" :currency="$currency" :period="$period" size="lg" class="@xl:justify-end" />
            {{ $action }}
        </div>
    </article>
</div>

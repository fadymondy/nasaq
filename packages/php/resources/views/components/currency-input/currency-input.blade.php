{{-- <x-nq::currency-input name="fee" :value="1999" currency="USD" aria-label="Fee" />
     A money field. value is an integer in minor units (cents, halalas, fils): 1999 is 19.99 USD; name adds a hidden input carrying it ("" when empty).
     currency: ISO 4217 code, sets the decimals (JPY 0, USD 2, KWD 3); default USD, or SAR in Arabic. currencies: show a picker with these codes.
     min / max (minor units) mark the field invalid outside them; clamp-on-blur pulls it back. allow-negative, numbering-system ("latn" | "arab"),
     overflow ("round" | "truncate"), symbol ("symbol" | "code" | "none"), :fixed-decimals="false", step (minor units, Shift x10), invalid, disabled, readonly, required, placeholder.
     x-model works on the amount (x-modelable="minor"); picking a currency dispatches "currency-change" ({ currency, minor }): @currency-change="...".
     id, aria-label and other attributes land on the text input; class lands on the wrapper. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'name' => null, 'currency' => null, 'currencies' => null, 'min' => null, 'max' => null, 'clampOnBlur' => false, 'allowNegative' => false, 'numberingSystem' => 'latn', 'locale' => null, 'overflow' => 'round', 'symbol' => 'symbol', 'fixedDecimals' => true, 'step' => null, 'invalid' => false, 'disabled' => false, 'readonly' => false, 'required' => false, 'placeholder' => null])
@php
    $locale ??= app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $options = array_filter([
        'currency' => $code,
        'locale' => str_replace('_', '-', $locale),
        'min' => $min,
        'max' => $max,
        'clampOnBlur' => $clampOnBlur ?: null,
        'allowNegative' => $allowNegative ?: null,
        'numberingSystem' => $numberingSystem !== 'latn' ? $numberingSystem : null,
        'overflow' => $overflow !== 'round' ? $overflow : null,
        'symbol' => $symbol !== 'symbol' ? $symbol : null,
        'fixedDecimals' => $fixedDecimals ? null : false,
        'step' => $step,
        'invalid' => $invalid ?: null,
    ], fn ($v) => $v !== null);
    $picker = is_array($currencies) && count($currencies) > 1;
    $end = \Nasaq\Nasaq::rtl($locale);
    $inner = $attributes->except(['class', 'x-model', 'x-on:currency-change', '@currency-change']);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'currency-input') }}" data-currency="{{ $code }}" x-data="nqCurrencyInput(@js($value), @js($options))" x-modelable="minor" x-id="['nq-currency']"
    {{ $attributes->except('data-slot')->only(['class', 'x-model', 'x-on:currency-change', '@currency-change'])->cn('flex w-full min-w-0 flex-col gap-1') }}>
    <x-nq::input-group x-bind="group" @class(['pe-0' => $picker])>
        {{-- The addon and input are written out: React overrides the addon data-slot, and HTML keeps the first of a duplicate attribute. --}}
        <div data-slot="currency-symbol" data-align="{{ $end ? 'end' : 'start' }}" x-bind="symbolAddon"
            class="{{ \Nasaq\Cn::merge('flex h-full shrink-0 items-center gap-1.5 text-body-sm text-muted-foreground [&_svg]:size-4', $end ? 'order-last ps-1 pe-3' : 'order-first ps-3 pe-1') }}">
            <span data-slot="input-group-text" class="select-none whitespace-nowrap"><bdi dir="ltr" x-text="mark()"></bdi></span>
        </div>
        <input data-slot="input-group-input" dir="ltr" x-bind="field" autocomplete="off" spellcheck="false" @if ($placeholder) placeholder="{{ $placeholder }}" @endif
            @disabled($disabled) @readonly($readonly) @required($required)
            {{ $inner->cn('h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-body text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed pointer-coarse:text-[16px] text-start tabular-nums') }}>
        @if ($picker)
            <x-nq::select :value="$code" x-model="currency">
                <x-nq::select.trigger :disabled="$disabled || $readonly" aria-label="{{ \Nasaq\Nasaq::t('Currency', 'العملة') }}"
                    class="h-full w-auto min-w-20 rounded-none border-0 border-s bg-nq-surface-soft focus-visible:outline-offset-[-2px]">
                    <span data-slot="select-value" class="min-w-0 flex-1 truncate text-start"><bdi dir="ltr" x-text="value">{{ $code }}</bdi></span>
                </x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ($currencies as $c)
                        <x-nq::select.item :value="$c"><bdi dir="ltr">{{ $c }}</bdi></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
        @endif
    </x-nq::input-group>
    <span x-show="out()" x-cloak style="display: none" :id="rangeId()" class="sr-only">{{ \Nasaq\Nasaq::t('Amount out of range', 'المبلغ خارج النطاق') }}</span>
    @if ($name)
        <input type="hidden" name="{{ $name }}" :value="minor === null ? '' : String(minor)">
    @endif
</div>

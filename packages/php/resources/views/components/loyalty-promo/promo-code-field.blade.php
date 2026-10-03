{{-- <x-nq::loyalty-promo.promo-code-field :applied="$applied" currency="USD" @nq-promo-apply="$event.detail.waitUntil(apply($event.detail.code))" @nq-promo-remove="clear()" />
     A promo-code box for checkout. Typing is upper-cased; Apply checks the format, then either your handler (server) or the promos you pass in (local rules).
     A success shows the code with the saving and a remove button; a failure says why under the field.
     applied: ['code', 'discount' (minor units)] or null, currency: USD, or SAR in Arabic, disabled, labels: override any built-in string by key, locale.
     promos: [['code', 'type' => percent|fixed, 'value' (basis points or minor units), 'maxDiscount'?, 'minSubtotal'?, 'startsOn'?, 'endsOn'?, 'maxRedemptions'?, 'perCustomer'?, 'firstOrderOnly'?, 'active'?]] with
     context: ['subtotal' (minor units), 'today' (YYYY-MM-DD), 'redemptions'?, 'customerRedemptions'?, 'firstOrder'?] let the field decide locally when nobody handles the event.
     Apply fires "nq-promo-apply" { code, setApplied({ code, discount }), waitUntil(promise), resolve(), reject(message) } on the root: reject (or resolve { error }) shows the message; on success
     call setApplied or re-render with applied. Remove fires "nq-promo-remove". A locally accepted code fires "nq-promo-applied" { applied }. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.loyalty-promo._logic')
@props(['applied' => null, 'currency' => null, 'disabled' => false, 'promos' => null, 'context' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_loyalty_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $config = ['applied' => $applied, 'currency' => $code, 'disabled' => (bool) $disabled, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en', 'promos' => $promos ? array_values($promos) : null, 'context' => $context, 't' => $t];
    $discount = $applied ? \Illuminate\Support\Number::currency(nq_loyalty_major($applied['discount'], $code), $code, $locale) : '';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'promo-code-field') }}" x-data="nqPromoCodeField(@js($config))" x-bind:data-state="applied ? 'applied' : 'idle'" data-state="{{ $applied ? 'applied' : 'idle' }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-1.5') }}>
    <div @if (! $applied) style="display: none" @endif x-show="applied" data-slot="promo-code-applied" class="flex items-center justify-between gap-3 rounded-card border border-nq-success/40 bg-nq-success-soft px-3 py-2">
        <div class="flex min-w-0 flex-col">
            <span class="flex items-center gap-1.5 text-body-sm font-medium text-nq-success-text">
                <x-lucide-tag aria-hidden="true" class="size-4" />
                <bdi dir="ltr" class="font-mono" x-text="applied ? applied.code : ''">{{ $applied['code'] ?? '' }}</bdi>
            </span>
            <span class="text-caption text-muted-foreground">{{ nq_loyalty_say($t['saves'], '') }}<bdi dir="ltr" x-text="applied ? money(applied.discount) : ''">{{ $discount }}</bdi></span>
        </div>
        <x-nq::button type="button" size="icon-sm" variant="ghost" aria-label="{{ $t['remove'] }}" x-on:click="remove()"><x-lucide-x aria-hidden="true" /></x-nq::button>
    </div>
    <form @if ($applied) style="display: none" @endif x-show="!applied" novalidate class="flex flex-col gap-1.5" x-on:submit.prevent="apply()">
        <label class="flex flex-col gap-1.5 text-label text-foreground">
            <span>{{ $t['promoCode'] }}</span>
            <span class="flex gap-2">
                <x-nq::field.input ltr class="flex-1 uppercase" autocomplete="off" placeholder="{{ $t['promoPlaceholder'] }}" x-model="value" x-on:input="onInput()"
                    x-bind:disabled="busy || disabled" x-bind:aria-invalid="error ? 'true' : null" />
                <x-nq::button type="submit" variant="secondary" x-bind:disabled="busy || disabled || !value.trim()" x-bind:aria-busy="busy ? 'true' : 'false'"><span>{{ $t['apply'] }}</span></x-nq::button>
            </span>
        </label>
        <p x-show="error" style="display: none" role="alert" class="text-caption text-nq-danger-text" x-text="error"></p>
    </form>
</div>

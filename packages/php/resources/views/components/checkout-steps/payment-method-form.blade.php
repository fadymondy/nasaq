{{-- <x-nq::checkout-steps.payment-method-form x-model="payment"> <x-slot:bankDetails>IBAN …</x-slot:bankDetails> </x-nq::checkout-steps.payment-method-form>
     The payment step on its own: a method picker (card | bank transfer) and the card fields. Presentational: it groups the card number,
     formats MM/YY, names the brand in text and reports the value. It never sends or stores the card.
     payment (x-modelable) is { method, number, holder, expiry, cvc }; bind it with x-model or wire:model. After the user presses
     continue, call validatePayment() from a parent scope, or read paymentErrors, to show the field errors.
     methods: ['card', 'bank'] (default both). labels: string overrides keyed like the checkout's (card, cardNumber, …). bankDetails slot: the bank account shown on the transfer panel.
     shared: render inside <x-nq::checkout-steps>, which already owns payment and paymentErrors (no scope of its own).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.checkout-steps._strings')
@props(['methods' => ['card', 'bank'], 'value' => [], 'labels' => [], 'shared' => false, 'bankDetails' => null])
@php
    $methods = array_values(array_intersect(['card', 'bank'], (array) $methods)) ?: ['card', 'bank'];
    $method = $value['method'] ?? $methods[0];
    $t = fn (string $key, string ...$args) => nq_checkout_text($key, (array) $labels, ...$args);
    $config = array_filter(['methods' => $methods, 'labels' => $labels ?: null, 'value' => $value ?: null], fn ($v) => $v !== null);
    $card = $method === 'card';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'payment-method-form') }}"
    @unless ($shared) x-data="nqPaymentMethodForm(@js($config))" x-modelable="payment" @endunless
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-5') }}>
    @if (count($methods) > 1)
        <x-nq::radio-group x-model="payment.method" :default-value="$method" :aria-label="$t('method')">
            @if (in_array('card', $methods, true))
                <x-nq::radio-group.card value="card" :title="$t('card')" :description="$t('cardDescription')" />
            @endif
            @if (in_array('bank', $methods, true))
                <x-nq::radio-group.card value="bank" :title="$t('bankTransfer')" :description="$t('bankDescription')" />
            @endif
        </x-nq::radio-group>
    @endif

    <div x-show="payment.method === 'card'" @unless ($card) style="display: none" @endunless class="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <x-nq::field name="cc-number" class="sm:col-span-2" x-model="paymentErrors.number">
            <x-nq::field.label>{{ $t('cardNumber') }}</x-nq::field.label>
            <div class="relative">
                <x-nq::field.input ltr inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" class="pe-28"
                    :value="$value['number'] ?? null" x-bind:value="payment.number" x-on:input="onNumber($event)" />
                <span data-slot="payment-brand" x-show="brand !== 'unknown'" style="display: none" x-text="brandName"
                    class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3 border-border text-muted-foreground pointer-events-none absolute end-2 top-1/2 -translate-y-1/2"></span>
            </div>
            <x-nq::field.error x-text="paymentErrors.number"></x-nq::field.error>
        </x-nq::field>
        <x-nq::field name="cc-name" class="sm:col-span-2" x-model="paymentErrors.holder">
            <x-nq::field.label>{{ $t('cardHolder') }}</x-nq::field.label>
            <x-nq::field.input autocomplete="cc-name" :value="$value['holder'] ?? null" x-bind:value="payment.holder" x-on:input="onHolder($event)" />
            <x-nq::field.error x-text="paymentErrors.holder"></x-nq::field.error>
        </x-nq::field>
        <x-nq::field name="cc-exp" x-model="paymentErrors.expiry">
            <x-nq::field.label>{{ $t('expiry') }}</x-nq::field.label>
            <x-nq::field.input ltr inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5"
                :value="$value['expiry'] ?? null" x-bind:value="payment.expiry" x-on:input="onExpiry($event)" />
            <x-nq::field.error x-text="paymentErrors.expiry"></x-nq::field.error>
        </x-nq::field>
        <x-nq::field name="cc-csc" x-model="paymentErrors.cvc">
            <x-nq::field.label>{{ $t('cvc') }}</x-nq::field.label>
            <x-nq::field.input ltr inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123"
                x-effect="$el.placeholder = cvcPlaceholder" :value="$value['cvc'] ?? null" x-bind:value="payment.cvc" x-on:input="onCvc($event)" />
            <x-nq::field.error x-text="paymentErrors.cvc"></x-nq::field.error>
        </x-nq::field>
        <p class="flex items-start gap-2 text-caption text-muted-foreground sm:col-span-2">
            <x-lucide-lock aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
            {{ $t('secure') }}
        </p>
    </div>
    <div x-show="payment.method === 'bank'" @if ($card) style="display: none" @endif class="flex flex-col gap-3 rounded-card bg-nq-surface p-4">
        <p class="flex items-start gap-2 text-body-sm text-foreground">
            <x-lucide-landmark aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {{ $t('bankNote') }}
        </p>
        {{ $bankDetails }}
    </div>
</div>

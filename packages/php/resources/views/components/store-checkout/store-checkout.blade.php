{{-- <x-nq::store-checkout :lines="$lines" :shipping-methods="$methods" :saved-addresses="$addresses" :payment-policy="['card' => true, 'cod' => ['fee' => 250]]" can-edit-cart can-track-order can-continue-shopping />
     One-page checkout for physical goods: four sections that open one after another (contact, delivery address, shipping method with gift and notes, payment) beside an order summary,
     then the order confirmation. Country-aware address fields (postal code, region and phone follow the country), card / cash on delivery / manual transfer / wallet payment with the
     limits of each applied, a failed order shows a retry. Parts (used inside it): store-checkout.address-form, .order-summary, .confirmation. Money is integer minor units (cents).
     lines: [['id', 'productId', 'variantId', 'name', 'variantLabel'?, 'image'?, 'unitPrice', 'compareAt'?, 'quantity']] (saved-for-later ones are left out). currency: ISO 4217 (USD, or SAR in Arabic, when omitted).
     shipping-methods: [['id', 'label', 'price', 'freeOver'?, 'etaDays'? => [min, max]]]. saved-addresses: [['id', 'name', 'phone', 'line1', 'line2'?, 'city', 'region'?, 'postalCode'?, 'country', 'isDefault'?]].
     countries: ISO codes offered (default: every supported country). account: ['name', 'email'] when signed in. payment-policy: ['card' => bool, 'cod' => ['maxTotal'?, 'countries'?, 'fee'?], 'wallet' => ['balance'], 'local' => [local-payments methods]].
     discount, tax-bps, tax-inclusive, gift-wrap-fee (offers gift wrap), weekend (day numbers that do not count for delivery, e.g. [5, 6]), now (ISO time deliveries are counted from),
     default-values (contact, shippingMethodId, payment, ... to start from), labels (string overrides keyed like the built-in strings).
     can-sign-in, can-edit-cart, can-track-order, can-continue-shopping show those buttons. Events on the root (bubbling; nobody listening means success, the order number becomes #1001):
     nq-store-checkout-place { draft, resolve({ orderNumber } | { order } | { error }), reject(message), waitUntil(promise) } to send the order (draft = { data, lines, summary, shippingMethod, card?, order, attempt }; never log the card),
     nq-store-checkout-placed { order }, nq-store-checkout-sign-in, nq-store-checkout-edit-cart, nq-store-checkout-track { order }, nq-store-checkout-continue.
     The embedded <x-nq::local-payments> amount is the order total before shipping (it is rendered once); its "nq-local-payment-submit" is read, not claimed: claim it on a wrapper to verify the transfer.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-checkout._strings')
@props([
    'lines' => [], 'currency' => null, 'shippingMethods' => [], 'savedAddresses' => [], 'countries' => [], 'account' => null, 'paymentPolicy' => ['card' => true],
    'discount' => 0, 'taxBps' => null, 'taxInclusive' => null, 'giftWrapFee' => null, 'weekend' => [], 'now' => null, 'defaultValues' => [], 'labels' => [],
    'canSignIn' => false, 'canEditCart' => false, 'canTrackOrder' => false, 'canContinueShopping' => false,
])
@php
    $t = nq_store_checkout_t((array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $coLines = array_values(array_filter(array_map(fn ($l) => (array) $l, (array) $lines), fn ($l) => empty($l['savedForLater'])));
    $coMethods = array_values(array_map(fn ($m) => (array) $m, (array) $shippingMethods));
    $coSaved = array_values(array_map(fn ($a) => (array) $a, (array) $savedAddresses));
    $coAccount = $account ? (array) $account : null;
    $coPolicy = (array) $paymentPolicy ?: ['card' => true];
    $coSubtotal = array_sum(array_map(fn ($l) => ((int) $l['unitPrice']) * ((int) $l['quantity']), $coLines));
    $digits = in_array($code, ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX'], true) ? 0 : (in_array($code, ['KWD', 'BHD', 'OMR', 'JOD', 'TND'], true) ? 3 : 2);
    $coMoney = fn (int|float $minor) => \Nasaq\Nasaq::money($minor / (10 ** $digits), $code);
    $coFill = fn (string $template, string ...$args) => nq_store_checkout_fill($template, ...$args);
    $coDefaultAddress = collect($coSaved)->firstWhere('isDefault', true) ?? ($coSaved[0] ?? null);
    $coSavedDefault = $coDefaultAddress ? ($coDefaultAddress['id'] ?? null) : null;
    $sections = ['contact', 'address', 'delivery', 'payment'];
    $kinds = array_values(array_filter(['card', 'cod', 'local', 'wallet'], fn ($k) => match ($k) {
        'card' => ($coPolicy['card'] ?? true) !== false,
        'cod' => ! empty($coPolicy['cod']),
        'local' => ! empty($coPolicy['local']),
        'wallet' => ! empty($coPolicy['wallet']),
    }));
    $config = array_filter([
        'locale' => app()->getLocale(), 'currency' => $code, 't' => $t, 'lines' => $coLines, 'shippingMethods' => $coMethods, 'savedAddresses' => $coSaved,
        'countries' => $countries ? array_values((array) $countries) : null, 'account' => $coAccount, 'paymentPolicy' => $coPolicy, 'discount' => (int) $discount,
        'taxBps' => $taxBps, 'taxInclusive' => $taxInclusive, 'giftWrapFee' => $giftWrapFee, 'weekend' => array_values((array) $weekend), 'now' => $now,
        'defaultValues' => $defaultValues ?: null,
    ], fn ($v) => $v !== null);
    $freeThreshold = $coSubtotal - (int) $discount;
@endphp
@if (count($coLines) === 0)
    <div data-slot="{{ $attributes->get('data-slot', 'store-checkout') }}" x-data="{}" {{ $attributes->except('data-slot')->cn('mx-auto w-full max-w-2xl px-4 py-10') }}>
        <x-nq::states.empty icon="shopping-bag" :title="$t['emptyTitle']" :description="$t['emptyDescription']">
            @if ($canContinueShopping)
                <x-slot:actions><x-nq::button variant="primary" x-on:click="$dispatch('nq-store-checkout-continue')">{{ $t['emptyAction'] }}</x-nq::button></x-slot:actions>
            @endif
        </x-nq::states.empty>
    </div>
@else
<div data-slot="{{ $attributes->get('data-slot', 'store-checkout') }}" x-data="nqStoreCheckout(@js($config))" x-bind:data-status="state.status" x-on:nq-local-payment-submit="onLocalSubmit($event)"
    {{ $attributes->except('data-slot')->cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6') }}>
    <div x-show="isForm">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h1 class="text-h1 font-semibold tracking-tight text-foreground">{{ $t['title'] }}</h1>
            <span class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                <x-lucide-lock aria-hidden="true" class="size-3.5" />
                {{ $t['secure'] }}
            </span>
        </div>
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <x-nq::store-checkout.order-summary :can-edit-cart="$canEditCart" :labels="$labels" class="lg:sticky lg:top-4 lg:order-2" />
            <form novalidate x-bind:aria-busy="ariaBusy" x-on:submit.prevent="place()" class="flex min-w-0 flex-col gap-4 lg:order-1">
                @foreach ($sections as $index => $sid)
                    <section data-slot="store-checkout-section" data-section="{{ $sid }}" x-data="{ id: @js($sid) }" x-bind:data-state="sectionState(id)" aria-labelledby="nq-co-{{ $sid }}"
                        x-bind:class="{ 'border-nq-line-strong': isOpen(id), 'border-border': ! isOpen(id) }"
                        class="rounded-card border bg-card {{ $index === 0 ? 'border-nq-line-strong' : 'border-border' }}">
                        <div class="flex items-start gap-3 p-4">
                            <span aria-hidden="true" x-bind:class="badgeClass(id)"
                                class="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-medium {{ $index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground' }}">
                                <x-lucide-check class="size-3.5" x-show="isDone(id)" style="display: none" />
                                <span x-show="! isDone(id)">{{ $index + 1 }}</span>
                            </span>
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <h2 id="nq-co-{{ $sid }}" x-ref="h-{{ $sid }}" tabindex="-1" class="text-h3 font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                                    {{ $t['steps'][$sid] }}
                                    <span class="sr-only"> {{ $coFill($t['stepOf'], (string) ($index + 1), '4') }}</span>
                                </h2>
                                <p x-show="showSummaryLine(id)" style="display: none" x-text="summaryOf(id)" class="text-body-sm text-muted-foreground [overflow-wrap:anywhere]"></p>
                            </div>
                            <x-nq::button variant="link" size="sm" x-show="showEdit(id)" style="display: none" x-bind:aria-label="editLabel(id)" x-on:click="open(id)">{{ $t['edit'] }}</x-nq::button>
                        </div>
                        <div x-show="isOpen(id)" @unless ($index === 0) style="display: none" @endunless class="flex flex-col gap-4 px-4 pb-4 ps-[3.25rem] max-sm:ps-4">
                            @if ($sid === 'contact')
                                <div class="flex flex-col gap-4">
                                    <div role="tablist" aria-label="{{ $t['steps']['contact'] }}" data-slot="tabs-list" data-variant="segmented"
                                        class="relative z-0 flex max-w-full w-fit gap-0.5 overflow-x-auto rounded-control bg-secondary p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        @foreach (['guest' => ['guestMode', $t['guest']], 'account' => ['accountMode', $coAccount ? $t['accountTab'] : $t['signIn']]] as $mode => [$flag, $text])
                                            <button type="button" role="tab" data-slot="tabs-tab" x-on:click="setMode('{{ $mode }}')" x-bind:aria-selected="{{ $flag }} ? 'true' : 'false'" x-bind:data-active="{{ $flag }} ? '' : null"
                                                class="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius-control)-2px)] px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground data-active:bg-card data-active:text-foreground data-active:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ $text }}</button>
                                        @endforeach
                                    </div>
                                    <div role="tabpanel" data-slot="tabs-panel" x-show="guestMode" class="flex flex-col gap-4 outline-none">
                                        @include('nasaq::components.store-checkout._field', [
                                            'id' => 'nq-co-email', 'label' => $t['email'], 'model' => 'state.data.contact.email', 'msg' => 'emailError', 'ltr' => true,
                                            'extra' => 'name="email" type="email" autocomplete="email" inputmode="email"', 'hintText' => $t['emailHint'],
                                        ])
                                        <label class="flex items-center gap-2 text-body-sm text-foreground">
                                            <x-nq::checkbox x-model="state.data.contact.marketing" />
                                            {{ $t['marketing'] }}
                                        </label>
                                        <p class="text-caption text-muted-foreground">{{ $t['guestNote'] }}</p>
                                    </div>
                                    <div role="tabpanel" data-slot="tabs-panel" x-show="accountMode" style="display: none" class="flex flex-col gap-3 outline-none">
                                        @if ($coAccount)
                                            <p class="flex items-center gap-2 text-body-sm text-foreground">
                                                <x-lucide-circle-check aria-hidden="true" class="size-4 text-nq-success-text" />
                                                {{ $coFill($t['signedInAs'], (string) ($coAccount['name'] ?? '')) }}
                                                <bdi dir="ltr" class="text-muted-foreground">{{ $coAccount['email'] ?? '' }}</bdi>
                                            </p>
                                        @else
                                            <p class="text-body-sm text-muted-foreground">{{ $t['signInNote'] }}</p>
                                            <p role="alert" x-show="signInError" style="display: none" class="text-caption text-nq-danger-text">{{ $t['problems']['signIn'] }}</p>
                                            @if ($canSignIn)
                                                <div><x-nq::button variant="secondary" x-on:click="signIn()">{{ $t['signIn'] }}</x-nq::button></div>
                                            @endif
                                        @endif
                                    </div>
                                </div>
                            @elseif ($sid === 'address')
                                <div class="flex flex-col gap-4">
                                    @if (count($coSaved))
                                        <x-nq::radio-group x-model="savedChoice" :default-value="$coSavedDefault ?? '__new'" :aria-label="$t['savedAddresses']">
                                            @foreach ($coSaved as $a)
                                                @php
                                                    $aLines = array_values(array_filter([$a['line1'] ?? '', $a['line2'] ?? '', implode(', ', array_filter([$a['city'] ?? '', $a['region'] ?? '', $a['postalCode'] ?? '']))]));
                                                    $aBody = '<span class="flex flex-col">'.collect($aLines)->map(fn ($l) => '<span>'.e($l).'</span>')->implode('').(! empty($a['phone']) ? '<bdi dir="ltr">'.e($a['phone']).'</bdi>' : '').'</span>';
                                                @endphp
                                                @include('nasaq::components.store-checkout._radio-card', [
                                                    'value' => $a['id'] ?? $a['line1'], 'default' => $coSavedDefault ?? '__new',
                                                    'title' => '<span class="flex items-center gap-2">'.e($a['name'] ?? '').'</span>', 'description' => $aBody,
                                                    'meta' => ! empty($a['isDefault']) ? '<span data-slot="badge" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border bg-secondary px-1.5 text-caption font-medium text-foreground">'.e(\Nasaq\Nasaq::t('Default', 'الافتراضي')).'</span>' : null,
                                                ])
                                            @endforeach
                                            @include('nasaq::components.store-checkout._radio-card', ['value' => '__new', 'default' => $coSavedDefault ?? '__new', 'title' => e($t['newAddress'])])
                                        </x-nq::radio-group>
                                    @endif
                                    <div x-show="newAddress" @if ($coSavedDefault) style="display: none" @endif>
                                        <x-nq::store-checkout.address-form which="shipping" :labels="$labels" />
                                    </div>
                                    <label class="flex items-center gap-2 text-body-sm text-foreground">
                                        <x-nq::checkbox x-model="state.data.billingSame" :checked="true" />
                                        {{ $t['billingSame'] }}
                                    </label>
                                    <div x-show="billingOther" style="display: none" class="flex flex-col gap-3">
                                        <h3 class="text-label text-foreground">{{ $t['billingTitle'] }}</h3>
                                        <x-nq::store-checkout.address-form which="billing" hide-phone :labels="$labels" />
                                    </div>
                                </div>
                            @elseif ($sid === 'delivery')
                                <div class="flex flex-col gap-5">
                                    <div class="flex flex-col gap-2">
                                        <span class="text-label text-foreground">{{ $t['shippingMethod'] }}</span>
                                        <x-nq::radio-group x-model="state.data.shippingMethodId" :aria-label="$t['shippingMethod']">
                                            @foreach ($coMethods as $m)
                                                @php
                                                    $free = ((int) ($m['price'] ?? 0)) === 0 || (isset($m['freeOver']) && $freeThreshold >= (int) $m['freeOver']);
                                                    $mid = \Illuminate\Support\Js::from((string) $m['id'])->toHtml();
                                                    $meta = '<span x-show="methodFree('.e($mid).')" class="text-label text-nq-success-text"'.($free ? '' : ' style="display: none"').'>'.e($t['free']).'</span>'
                                                        .'<bdi x-show="methodPaid('.e($mid).')" class="tabular-nums" x-text="methodPrice('.e($mid).')"'.($free ? ' style="display: none"' : '').'>'.($free ? '' : e($coMoney((int) $m['price']))).'</bdi>';
                                                @endphp
                                                @include('nasaq::components.store-checkout._radio-card', [
                                                    'value' => $m['id'], 'default' => null,
                                                    'title' => '<span class="flex items-center gap-2"><svg aria-hidden="true" class="size-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'.e($m['label'] ?? '').'</span>',
                                                    'descExpr' => 'etaOf('.$mid.')', 'meta' => $meta,
                                                ])
                                            @endforeach
                                        </x-nq::radio-group>
                                        <p role="alert" x-show="!! methodError" style="display: none" x-text="methodError" class="text-caption text-nq-danger-text"></p>
                                    </div>
                                    <fieldset class="flex flex-col gap-3 rounded-control border border-border p-3">
                                        <legend class="px-1 text-label text-foreground">{{ $t['giftTitle'] }}</legend>
                                        <label class="flex items-center gap-2 text-body-sm text-foreground">
                                            <x-nq::switch x-model="state.data.gift.enabled" />
                                            {{ $t['giftToggle'] }}
                                        </label>
                                        <div x-show="giftOn" style="display: none" class="flex flex-col gap-3">
                                            @include('nasaq::components.store-checkout._field', [
                                                'id' => 'nq-co-gift-message', 'label' => $t['giftMessage'], 'model' => 'state.data.gift.message', 'msg' => 'giftError', 'kind' => 'textarea',
                                                'extra' => 'name="giftMessage"', 'hint' => 'giftLeftText',
                                            ])
                                            @if ($giftWrapFee !== null)
                                                <label class="flex items-center gap-2 text-body-sm text-foreground">
                                                    <x-nq::checkbox x-model="state.data.gift.wrap" />
                                                    <span x-text="giftWrapText">{{ $coFill($t['giftWrapFee'], $coMoney((int) $giftWrapFee)) }}</span>
                                                </label>
                                            @endif
                                            <label class="flex items-center gap-2 text-body-sm text-foreground">
                                                <x-nq::checkbox x-model="state.data.gift.hidePrices" />
                                                {{ $t['hidePrices'] }}
                                            </label>
                                        </div>
                                    </fieldset>
                                    @include('nasaq::components.store-checkout._field', [
                                        'id' => 'nq-co-notes', 'label' => $t['notes'], 'model' => 'state.data.notes', 'msg' => 'notesError', 'kind' => 'textarea',
                                        'extra' => 'name="notes" placeholder="'.e($t['notesPlaceholder']).'"', 'hint' => 'notesLeftText',
                                    ])
                                </div>
                            @else
                                <div class="flex flex-col gap-4">
                                    <div class="flex flex-col gap-2">
                                        <span class="text-label text-foreground">{{ $t['paymentMethod'] }}</span>
                                        <x-nq::radio-group x-model="kindChoice" :aria-label="$t['paymentMethod']">
                                            @foreach ($kinds as $k)
                                                @include('nasaq::components.store-checkout._radio-card', [
                                                    'value' => $k, 'default' => null, 'title' => e($t[$k]), 'descExpr' => "kindText('{$k}')", 'disabledExpr' => "kindDisabled('{$k}')",
                                                    'meta' => $k === 'cod' && ! empty($coPolicy['cod']['fee']) ? '<span x-text="codFeeText" class="text-caption text-muted-foreground"></span>' : null,
                                                ])
                                            @endforeach
                                        </x-nq::radio-group>
                                        <p role="alert" x-show="!! paymentError" style="display: none" x-text="paymentError" class="text-caption text-nq-danger-text"></p>
                                    </div>
                                    @if (in_array('card', $kinds, true))
                                        <div x-show="isCard" style="display: none" class="flex flex-col gap-2">
                                            <x-nq::checkout-steps.payment-method-form :methods="['card']" shared />
                                            <p role="alert" x-show="cardProblem" style="display: none" class="text-caption text-nq-danger-text">{{ $t['paymentProblems']['card'] }}</p>
                                        </div>
                                    @endif
                                    @if (in_array('cod', $kinds, true))
                                        <p x-show="isCod" style="display: none" x-text="codText" class="text-body-sm text-muted-foreground"></p>
                                    @endif
                                    @if (in_array('wallet', $kinds, true))
                                        <p x-show="isWallet" style="display: none" x-text="walletText" class="text-body-sm text-muted-foreground"></p>
                                    @endif
                                    @if (in_array('local', $kinds, true))
                                        <div x-show="isLocal" style="display: none" class="flex flex-col gap-2">
                                            <x-nq::local-payments :amount="max($freeThreshold, 0)" :currency="$code" :methods="$coPolicy['local']" />
                                            <p role="status" x-show="!! localSentText" style="display: none" x-text="localSentText" class="text-body-sm text-nq-success-text"></p>
                                            <p role="alert" x-show="localProblem" style="display: none" class="text-caption text-nq-danger-text">{{ $t['paymentProblems']['local'] }}</p>
                                        </div>
                                    @endif
                                </div>
                            @endif
                            @unless ($sid === 'payment')
                                <div x-show="showContinue(id)" @unless ($index === 0) style="display: none" @endunless>
                                    <x-nq::button variant="primary" x-on:click="next()">{{ $t['continue'] }}</x-nq::button>
                                </div>
                            @endunless
                        </div>
                    </section>
                @endforeach

                <x-nq::alert tone="danger" :title="$t['failedTitle']" x-show="failed" style="display: none">
                    <span x-text="failureText">{{ $t['failedGeneric'] }}</span>
                    <x-slot:action><x-nq::button size="sm" variant="secondary" x-on:click="dismiss()">{{ $t['dismiss'] }}</x-nq::button></x-slot:action>
                </x-nq::alert>
                <div class="flex flex-col gap-2">
                    <x-nq::button type="submit" variant="primary" size="lg" class="w-full" data-slot="store-place-order" x-bind:disabled="busy" x-bind:aria-busy="ariaBusy"><span x-text="placeLabel">{{ $t['placeOrder'] }}</span></x-nq::button>
                    <p x-show="showIncomplete" class="text-caption text-muted-foreground">{{ $t['incomplete'] }}</p>
                    <p class="text-caption text-muted-foreground">{{ $t['terms'] }}</p>
                </div>
            </form>
        </div>
    </div>
    <x-nq::store-checkout.confirmation x-show="isPlaced" style="display: none" :can-track-order="$canTrackOrder" :can-continue-shopping="$canContinueShopping" :labels="$labels" />
</div>
@endif

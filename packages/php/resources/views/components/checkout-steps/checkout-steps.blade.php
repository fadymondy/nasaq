{{-- <x-nq::checkout-steps :plans="$plans" currency="USD" :tax-rate="0.15" tax-label="VAT" />
     Subscription checkout in five steps: plan, billing details, payment method, review, success. A stepper on top, an order summary beside the form.
     Presentational: it formats and checks what is typed (card grouping, Luhn, expiry), keeps the whole flow in the page, and hands the finished order
     to YOUR code. It never charges a card, and the card number and code are never part of the order (only brand, last four digits and holder).
     plans: [['id' => 'team', 'name' => 'Team', 'monthlyPrice' => 49, 'yearlyPrice' => 490, 'features' => [...], 'badge' => 'Most popular', 'highlighted' => true]].
     yearlyPrice defaults to monthlyPrice x 12. currency: ISO code (USD, or SAR in Arabic, when omitted). tax-rate: 0.15 adds a tax line; tax-label names it (VAT).
     default-plan-id, default-interval (month | year), default-billing (name, email, company, taxId, country, address, city, postalCode), countries
     ([['value' => 'SA', 'label' => 'Saudi Arabia']], a short Gulf list when omitted), payment-methods (['card', 'bank']), default-step (plan | billing | payment | review),
     done (shows the "Go to dashboard" button on the success step), labels (string overrides keyed like the React STRINGS; {0} {1} are the arguments).
     bankDetails slot: the account to pay into, shown on the bank transfer panel.

     React's onComplete(order) Promise becomes events, because a Blade page has no callback props. Needs the Alpine runtime (@nasaqScripts).
       nq-checkout-step      { step }                    bubbles after every step change
       nq-checkout-complete  { order, resolve, reject }  cancelable; fired when the user presses Pay
       nq-checkout-done      { reference }               the success step's button (when done is set)
     The order is { planId, interval, billing, payment, currency, subtotal, tax, total }.
     If nothing calls preventDefault() on nq-checkout-complete the payment counts as successful at once (no reference). To charge it for real, call
     preventDefault(), do the work, then settle it with detail.resolve({ reference: 'SUB-1042' }) (go to the success step and show the reference),
     detail.resolve({ error: 'Card declined' }) (stay on review and show the message) or detail.reject(error) (same, the error message or a generic one).
       <div @nq-checkout-complete.prevent="charge($event.detail)">…<x-nq::checkout-steps …/>…</div>
       charge({ order, resolve, reject }) { fetch('/api/subscribe', { method: 'POST', body: JSON.stringify(order) }).then(() => resolve({ reference: 'SUB-1042' }), reject) }
     Layout: a container query puts the summary beside the form from 48rem of width. --}}
@include('nasaq::components.checkout-steps._strings')
@props([
    'plans' => [],
    'currency' => null,
    'taxRate' => 0,
    'taxLabel' => null,
    'defaultPlanId' => null,
    'defaultInterval' => 'month',
    'defaultBilling' => [],
    'countries' => null,
    'paymentMethods' => ['card', 'bank'],
    'defaultStep' => 'plan',
    'done' => false,
    'labels' => [],
    'bankDetails' => null,
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $labels = (array) $labels;
    $t = fn (string $key, string ...$args) => nq_checkout_text($key, $labels, ...$args);
    $round = fn ($n) => round($n * 100) / 100;
    $plans = array_values((array) $plans);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $money = fn ($n) => \Nasaq\Nasaq::money($n, $code);
    $interval = $defaultInterval === 'year' ? 'year' : 'month';
    $steps = ['plan', 'billing', 'payment', 'review'];
    $step = in_array($defaultStep, $steps, true) ? $defaultStep : 'plan';
    $index = array_search($step, $steps, true);
    $highlighted = collect($plans)->first(fn ($p) => ! empty($p['highlighted']));
    $planId = $defaultPlanId ?? ($highlighted['id'] ?? ($plans[0]['id'] ?? ''));
    $plan = collect($plans)->first(fn ($p) => $p['id'] === $planId) ?? ($plans[0] ?? null);
    $price = fn (array $p, string $by) => $by === 'year' ? ($p['yearlyPrice'] ?? $p['monthlyPrice'] * 12) : $p['monthlyPrice'];
    $subtotal = $plan ? $price($plan, $interval) : 0;
    $tax = $round($subtotal * (float) $taxRate);
    $total = $round($subtotal + $tax);
    $saving = $plan && isset($plan['yearlyPrice']) ? 1 - $plan['yearlyPrice'] / ($plan['monthlyPrice'] * 12) : 0;
    $savePct = fn ($s) => (int) round($s * 100).'%';
    $billing = array_merge(['name' => '', 'email' => '', 'company' => '', 'taxId' => '', 'country' => 'SA', 'address' => '', 'city' => '', 'postalCode' => ''], (array) $defaultBilling);
    $countries = $countries ?? ($ar
        ? [['value' => 'SA', 'label' => 'المملكة العربية السعودية'], ['value' => 'AE', 'label' => 'الإمارات العربية المتحدة'], ['value' => 'EG', 'label' => 'مصر'], ['value' => 'KW', 'label' => 'الكويت'], ['value' => 'US', 'label' => 'الولايات المتحدة'], ['value' => 'GB', 'label' => 'المملكة المتحدة']]
        : [['value' => 'SA', 'label' => 'Saudi Arabia'], ['value' => 'AE', 'label' => 'United Arab Emirates'], ['value' => 'EG', 'label' => 'Egypt'], ['value' => 'KW', 'label' => 'Kuwait'], ['value' => 'US', 'label' => 'United States'], ['value' => 'GB', 'label' => 'United Kingdom']]);
    $countryLabel = collect($countries)->first(fn ($c) => $c['value'] === $billing['country'])['label'] ?? $billing['country'];
    $methods = array_values(array_intersect(['card', 'bank'], (array) $paymentMethods)) ?: ['card', 'bank'];
    $titles = ['plan' => $t('plan'), 'billing' => $t('billing'), 'payment' => $t('payment'), 'review' => $t('review'), 'success' => $t('success')];
    $config = array_filter([
        'plans' => $plans,
        'currency' => $code,
        'taxRate' => (float) $taxRate,
        'taxLabel' => $taxLabel,
        'defaultPlanId' => $planId,
        'defaultInterval' => $interval,
        'defaultBilling' => $billing,
        'countries' => $countries,
        'paymentMethods' => $methods,
        'defaultStep' => $step,
        'done' => (bool) $done ?: null,
        'labels' => $labels ?: null,
    ], fn ($v) => $v !== null);
    $hide = fn (bool $show) => $show ? '' : 'display: none';
    $markerBase = 'relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5';
    $markerStatus = 'group-data-[status=complete]/step:border-transparent group-data-[status=complete]/step:bg-primary group-data-[status=complete]/step:text-primary-foreground group-data-[status=current]/step:border-nq-focus group-data-[status=current]/step:bg-background group-data-[status=current]/step:text-foreground group-data-[status=current]/step:ring-2 group-data-[status=current]/step:ring-nq-focus/30 group-data-[status=upcoming]/step:border-border group-data-[status=upcoming]/step:bg-background group-data-[status=upcoming]/step:text-muted-foreground';
    $status = fn (int $i) => $i < $index ? 'complete' : ($i === $index ? 'current' : 'upcoming');
    $statusText = ['complete' => \Nasaq\Nasaq::t('Completed', 'مكتملة'), 'current' => \Nasaq\Nasaq::t('Current step', 'الخطوة الحالية'), 'upcoming' => \Nasaq\Nasaq::t('Upcoming', 'قادمة')];
    $heading = $t($step.'Title');
    $description = $t($step.'Description');
    $perText = $interval === 'year' ? $t('yearly') : $t('monthly');
    $amountClass = 'tabular-nums';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'checkout-steps') }}" data-step="{{ $step }}" x-effect="$el.setAttribute('data-step', step)" x-data="nqCheckoutSteps(@js($config))" x-id="['nq-checkout']"
    {{ $attributes->except('data-slot')->cn('@container flex flex-col gap-6') }}>
    <nav aria-label="{{ $t('steps') }}" class="flex flex-col gap-2">
        <ol data-slot="stepper" data-orientation="horizontal" class="m-0 flex list-none flex-row items-start p-0">
            @foreach ($steps as $i => $id)
                <li data-slot="stepper-item" data-status="{{ $status($i) }}" x-effect="$el.setAttribute('data-status', status({{ $i }}))" class="group/step flex flex-1 items-start last:flex-none">
                    <button type="button" data-slot="stepper-step" @if ($i === $index) aria-current="step" @endif x-effect="$el.disabled = ! canGo({{ $i }}); status({{ $i }}) === 'current' ? $el.setAttribute('aria-current', 'step') : $el.removeAttribute('aria-current')"
                        @unless ($i < $index) disabled @endunless x-on:click="goTo({{ $i }})"
                        class="flex shrink-0 items-start gap-3 rounded-control text-start outline-none enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                        <span data-slot="stepper-marker" class="{{ \Nasaq\Cn::merge($markerBase, 'border-border bg-background text-muted-foreground', $markerStatus) }}">
                            <x-lucide-check aria-hidden="true" x-show="status({{ $i }}) === 'complete'" :style="$hide($i < $index)" />
                            <span x-show="status({{ $i }}) !== 'complete'" @if ($i < $index) style="display: none" @endif><x-nq::numeric :value="$i + 1" /></span>
                        </span>
                        <span data-slot="stepper-text" class="flex min-w-0 flex-col text-start">
                            <span class="text-label text-foreground">
                                <span class="max-sm:sr-only">{{ $titles[$id] }}</span>
                                <span class="sr-only" x-text="' (' + statusText({{ $i }}) + ')'"> ({{ $statusText[$status($i)] }})</span>
                            </span>
                        </span>
                    </button>
                    <span aria-hidden="true" data-slot="stepper-connector"
                        class="mx-3 mt-3.5 h-px min-w-6 flex-1 rounded-full bg-border transition-colors duration-150 ease-nq group-last/step:hidden group-data-[status=complete]/step:bg-primary"></span>
                </li>
            @endforeach
        </ol>
        <p class="text-caption text-muted-foreground sm:hidden" x-show="step !== 'success'" x-text="stepOfText()">{{ $t('stepOf', (string) ($index + 1), (string) count($steps)) }} · {{ $titles[$step] }}</p>
    </nav>

    <section aria-live="polite" x-show="step === 'success'" style="display: none"
        class="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-card bg-nq-surface px-6 py-12 text-center">
        <span class="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
            <x-lucide-circle-check aria-hidden="true" class="size-6" />
        </span>
        <h2 x-ref="successHeading" tabindex="-1" class="text-h2 text-foreground outline-none">{{ $t('successTitle') }}</h2>
        <p class="text-body text-muted-foreground" x-text="text('successDescription', plan.name)">{{ $t('successDescription', $plan['name'] ?? '') }}</p>
        <p class="text-body-sm text-muted-foreground" x-show="reference" style="display: none">
            {{ $t('reference') }}: <bdi dir="ltr" class="font-mono text-foreground" x-text="reference"></bdi>
        </p>
        <p class="text-body-sm text-foreground">
            <bdi class="{{ $amountClass }}" x-text="money(total)">{{ $money($total) }}</bdi> · <span x-text="interval === 'year' ? text('perYear') : text('perMonth')">{{ $interval === 'year' ? $t('perYear') : $t('perMonth') }}</span>
        </p>
        <x-nq::button variant="primary" x-show="config.done" x-on:click="done()" :style="$hide((bool) $done)">{{ $t('done') }}</x-nq::button>
    </section>

    <div x-show="step !== 'success'" class="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section class="flex min-w-0 flex-col gap-5" x-bind:aria-labelledby="$id('nq-checkout') + '-h'">
            <header class="flex flex-col gap-1">
                <h2 x-bind:id="$id('nq-checkout') + '-h'" x-ref="heading" tabindex="-1" class="text-h2 text-foreground outline-none" x-text="heading">{{ $heading }}</h2>
                <p class="text-body-sm text-muted-foreground" x-text="description">{{ $description }}</p>
            </header>

            {{-- Step 1: plan --}}
            <div x-show="step === 'plan'" @if ($step !== 'plan') style="display: none" @endif class="flex flex-col gap-5">
                <x-nq::toggle-group :aria-label="$t('interval')" :default-value="[$interval]" x-model="intervalValue">
                    <x-nq::toggle-group.toggle value="month">{{ $t('monthly') }}</x-nq::toggle-group.toggle>
                    <x-nq::toggle-group.toggle value="year">
                        {{ $t('yearly') }}
                        @if ($saving > 0.005)
                            <x-nq::badge variant="success" class="ms-1" x-text="saveText">{{ $t('save', $savePct($saving)) }}</x-nq::badge>
                        @endif
                    </x-nq::toggle-group.toggle>
                </x-nq::toggle-group>
                <x-nq::plan-card.grid>
                    @foreach ($plans as $p)
                        @php
                            $amount = $interval === 'year' && isset($p['yearlyPrice']) ? $round($p['yearlyPrice'] / 12) : $p['monthlyPrice'];
                            $note = $interval === 'year' && isset($p['yearlyPrice']) ? $t('billedYearly', $money($p['yearlyPrice'])) : $t('billedMonthly');
                            $selected = $p['id'] === $planId;
                        @endphp
                        <x-nq::plan-card :name="$p['name']" :description="$p['description'] ?? null" :highlighted="! empty($p['highlighted'])" :badge="$p['badge'] ?? null" :features="$p['features'] ?? []">
                            <x-slot:price>
                                <span data-slot="price" class="inline-flex flex-wrap items-baseline gap-x-1.5 text-foreground text-body-sm">
                                    <span>
                                        <bdi class="tabular-nums text-h2 font-semibold tracking-tight" x-text="money(planAmount(@js($p['id'])))">{{ $money($amount) }}</bdi>
                                        <span class="text-muted-foreground">{{ \Nasaq\Nasaq::t('/mo', '/شهريًا') }}</span>
                                    </span>
                                </span>
                                <p class="text-caption text-muted-foreground" x-text="planNote(@js($p['id']))">{{ $note }}</p>
                            </x-slot:price>
                            <x-slot:action>
                                <x-nq::button variant="primary" aria-pressed="true" :data-plan="$p['id']" x-show="planId === $el.dataset.plan" :style="$hide($selected)">{{ $t('selected') }}</x-nq::button>
                                <x-nq::button variant="secondary" aria-pressed="false" :data-plan="$p['id']" x-show="planId !== $el.dataset.plan" x-on:click="choose($el.dataset.plan)" :style="$hide(! $selected)">{{ $t('choose') }}</x-nq::button>
                            </x-slot:action>
                        </x-nq::plan-card>
                    @endforeach
                </x-nq::plan-card.grid>
            </div>

            {{-- Step 2: billing --}}
            <form novalidate x-show="step === 'billing'" @if ($step !== 'billing') style="display: none" @endif x-on:submit.prevent="next()" class="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <x-nq::field name="name" x-model="billingErrors.name">
                    <x-nq::field.label>{{ $t('name') }}</x-nq::field.label>
                    <x-nq::field.input autocomplete="name" :value="$billing['name'] ?: null" x-model="billing.name" x-on:input="clearBilling('name')" />
                    <x-nq::field.error x-text="billingErrors.name"></x-nq::field.error>
                </x-nq::field>
                <x-nq::field name="email" x-model="billingErrors.email">
                    <x-nq::field.label>{{ $t('email') }}</x-nq::field.label>
                    <x-nq::field.input ltr type="email" inputmode="email" autocomplete="email" :value="$billing['email'] ?: null" x-model="billing.email" x-on:input="clearBilling('email')" />
                    <x-nq::field.error x-text="billingErrors.email"></x-nq::field.error>
                </x-nq::field>
                <x-nq::field name="company" x-model="billingErrors.company">
                    <x-nq::field.label>{{ $t('company') }}</x-nq::field.label>
                    <x-nq::field.input autocomplete="organization" :value="$billing['company'] ?: null" x-model="billing.company" x-on:input="clearBilling('company')" />
                    <x-nq::field.error x-text="billingErrors.company"></x-nq::field.error>
                </x-nq::field>
                <x-nq::field name="taxId" x-model="billingErrors.taxId">
                    <x-nq::field.label>{{ $t('taxId') }}</x-nq::field.label>
                    <x-nq::field.input ltr :value="$billing['taxId'] ?: null" x-model="billing.taxId" x-on:input="clearBilling('taxId')" />
                    <x-nq::field.error x-text="billingErrors.taxId"></x-nq::field.error>
                </x-nq::field>
                <x-nq::field class="sm:col-span-2" x-model="billingErrors.country">
                    <x-nq::field.label>{{ $t('country') }}</x-nq::field.label>
                    <x-nq::select :value="$billing['country']" x-model="billing.country">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($countries as $c)
                                <x-nq::select.item :value="$c['value']">{{ $c['label'] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                    <x-nq::field.error x-text="billingErrors.country"></x-nq::field.error>
                </x-nq::field>
                <x-nq::field name="address" class="sm:col-span-2" x-model="billingErrors.address">
                    <x-nq::field.label>{{ $t('address') }}</x-nq::field.label>
                    <x-nq::field.input autocomplete="street-address" :value="$billing['address'] ?: null" x-model="billing.address" x-on:input="clearBilling('address')" />
                    <x-nq::field.error x-text="billingErrors.address"></x-nq::field.error>
                </x-nq::field>
                <x-nq::field name="city" x-model="billingErrors.city">
                    <x-nq::field.label>{{ $t('city') }}</x-nq::field.label>
                    <x-nq::field.input autocomplete="address-level2" :value="$billing['city'] ?: null" x-model="billing.city" x-on:input="clearBilling('city')" />
                    <x-nq::field.error x-text="billingErrors.city"></x-nq::field.error>
                </x-nq::field>
                <x-nq::field name="postalCode" x-model="billingErrors.postalCode">
                    <x-nq::field.label>{{ $t('postalCode') }}</x-nq::field.label>
                    <x-nq::field.input ltr autocomplete="postal-code" :value="$billing['postalCode'] ?: null" x-model="billing.postalCode" />
                    <x-nq::field.error x-text="billingErrors.postalCode"></x-nq::field.error>
                </x-nq::field>
                <button type="submit" hidden></button>
            </form>

            {{-- Step 3: payment --}}
            <div x-show="step === 'payment'" @if ($step !== 'payment') style="display: none" @endif>
                <x-nq::checkout-steps.payment-method-form shared :methods="$methods" :labels="$labels">
                    <x-slot:bankDetails>{{ $bankDetails }}</x-slot:bankDetails>
                </x-nq::checkout-steps.payment-method-form>
            </div>

            {{-- Step 4: review --}}
            <div x-show="step === 'review'" @if ($step !== 'review') style="display: none" @endif class="flex flex-col gap-4">
                @foreach (['plan' => 'plan', 'billing' => 'billing', 'payment' => 'payment'] as $key => $target)
                    <x-nq::card class="gap-3">
                        <x-nq::card.header>
                            <x-nq::card.title as="h3">{{ $t($key) }}</x-nq::card.title>
                            <div class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                                <x-nq::button size="sm" variant="ghost" x-bind:disabled="busy" :data-step="$target" x-on:click="setStep($el.dataset.step)">{{ $t('edit') }}</x-nq::button>
                            </div>
                        </x-nq::card.header>
                        <x-nq::card.content class="text-body-sm text-foreground">
                            @if ($key === 'plan')
                                <div class="flex items-center justify-between gap-3">
                                    <span x-text="plan.name + ' · ' + (interval === 'year' ? text('yearly') : text('monthly'))">{{ ($plan['name'] ?? '').' · '.$perText }}</span>
                                    <bdi class="{{ $amountClass }}" x-text="money(subtotal)">{{ $money($subtotal) }}</bdi>
                                </div>
                            @elseif ($key === 'billing')
                                <address class="flex flex-col not-italic">
                                    <span x-text="billing.name">{{ $billing['name'] }}</span>
                                    <span x-show="billing.company" x-text="billing.company" @unless ($billing['company']) style="display: none" @endunless>{{ $billing['company'] }}</span>
                                    <bdi dir="ltr" class="text-start text-muted-foreground" x-text="billing.email">{{ $billing['email'] }}</bdi>
                                    <span class="text-muted-foreground" x-text="billingLine">{{ implode($ar ? '، ' : ', ', array_filter([$billing['address'], $billing['city'], $billing['postalCode'], $countryLabel])) }}</span>
                                    <bdi dir="ltr" class="text-start text-muted-foreground" x-show="billing.taxId" x-text="billing.taxId" @unless ($billing['taxId']) style="display: none" @endunless>{{ $billing['taxId'] }}</bdi>
                                </address>
                            @else
                                <span x-text="paymentLine">{{ $methods[0] === 'card' ? $t('cardEnding', \Nasaq\Nasaq::t('Card', 'بطاقة'), "\u{2066}\u{2069}") : $t('bankTransfer') }}</span>
                            @endif
                        </x-nq::card.content>
                    </x-nq::card>
                @endforeach
                <x-nq::field x-model="termsError">
                    <label class="flex items-start gap-2 text-body-sm text-foreground">
                        <x-nq::checkbox class="mt-0.5" x-model="accepted" />
                        <span>{{ $t('terms') }}</span>
                    </label>
                    <x-nq::field.error x-text="termsError"></x-nq::field.error>
                </x-nq::field>
                <p role="alert" x-show="error" x-text="error" style="display: none" class="rounded-control border border-nq-danger/40 bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text"></p>
                <span role="status" class="sr-only" x-text="busy ? text('paying') : ''"></span>
            </div>

            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <x-nq::button variant="ghost" x-show="index > 0" x-bind:disabled="busy" x-on:click="back()" :style="$hide($index > 0)">{{ $t('back') }}</x-nq::button>
                <span x-show="index === 0" @if ($index !== 0) style="display: none" @endif></span>
                <x-nq::button variant="primary" size="lg" x-show="step === 'review'" x-bind:disabled="busy" x-bind:aria-busy="busy" x-on:click="pay()" :style="$hide($step === 'review')">
                    <span x-show="busy" style="display: none"><x-nq::spinner /></span>
                    <span x-text="text('pay', money(total))">{{ $t('pay', $money($total)) }}</span>
                </x-nq::button>
                <x-nq::button variant="primary" x-show="step !== 'review'" x-on:click="next()" :style="$hide($step !== 'review')">{{ $t('continue') }}</x-nq::button>
            </div>
        </section>

        <aside data-slot="checkout-summary" aria-label="{{ $t('summary') }}">
            <x-nq::card class="h-fit gap-3">
                <x-nq::card.header>
                    <x-nq::card.title as="h2">{{ $t('summary') }}</x-nq::card.title>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-label text-foreground" x-text="plan.name">{{ $plan['name'] ?? '' }}</p>
                            <p class="text-caption text-muted-foreground" x-text="interval === 'year' ? text('yearly') : text('monthly')">{{ $perText }}</p>
                        </div>
                        <bdi class="text-label text-foreground {{ $amountClass }}" x-text="money(subtotal)">{{ $money($subtotal) }}</bdi>
                    </div>
                    <dl class="flex flex-col gap-2 border-t border-border pt-3 text-body-sm">
                        <div class="flex justify-between gap-3" x-show="tax > 0" @unless ($tax > 0) style="display: none" @endunless>
                            <dt class="text-muted-foreground" x-text="taxLabel">{{ $taxLabel ?? $t('tax') }}</dt>
                            <dd><bdi class="{{ $amountClass }}" x-text="money(tax)">{{ $money($tax) }}</bdi></dd>
                        </div>
                        <div class="flex justify-between gap-3 text-label text-foreground">
                            <dt>{{ $t('total') }}</dt>
                            <dd><bdi class="{{ $amountClass }}" x-text="money(total)">{{ $money($total) }}</bdi></dd>
                        </div>
                    </dl>
                </x-nq::card.content>
            </x-nq::card>
        </aside>
    </div>
</div>

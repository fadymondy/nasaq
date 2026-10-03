{{-- <x-nq::cash-collect :order-total-minor="8500" :delivery-fee-minor="1500" @nq-cash-collect-confirm="save($event.detail.collectedMinor)" />
     The cash-on-delivery sheet for a courier: order total plus delivery fee (minus anything paid online) as the amount due, an amount received field and a plain statement of what is short or what change to hand back.
     Nothing is conveyed by colour alone: the state is a sentence with an icon. Amounts are integer minor units (cents, halalas).
     order-total-minor, delivery-fee-minor (default 0), prepaid-minor (default 0, taken off the amount due). currency: ISO code (USD, or SAR in Arabic, when omitted). collected-minor: the initial cash received.
     allow-short: allow confirming less than what is due. quick-amounts: quick-pick buttons in minor units (default: the exact amount and the next round notes). loading: spinner on the confirm button.
     labels: ['title' => …, 'orderTotal' => …, 'deliveryFee' => …, 'prepaid' => …, 'due' => …, 'collected' => …, 'exact' => …, 'shortBy' => …, 'change' => …, 'unpaid' => …, 'prepaidAll' => …, 'confirm' => …, 'shortHelp' => …]. uid: the id prefix (default derived from the amounts).
     x-model works on the received amount (x-modelable="collected"). Confirm dispatches the bubbling "nq-cash-collect-confirm" with { collectedMinor }; every change dispatches "nq-cash-collect-change". Needs the Alpine runtime (@nasaqScripts). --}}
@props(['orderTotalMinor', 'deliveryFeeMinor' => 0, 'prepaidMinor' => 0, 'currency' => null, 'collectedMinor' => null, 'allowShort' => false, 'quickAmounts' => null, 'loading' => false, 'locale' => null, 'labels' => [], 'uid' => null])
@include('nasaq::components.courier-card._delivery')
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $code = strtoupper($currency ?? nq_delivery_currency($locale));
    $strings = [
        'en' => [
            'title' => 'Cash on delivery', 'orderTotal' => 'Order total', 'deliveryFee' => 'Delivery fee', 'prepaid' => 'Paid online', 'due' => 'Amount due', 'collected' => 'Cash received',
            'exact' => 'Exact amount', 'shortBy' => 'Still owed', 'change' => 'Change to return', 'unpaid' => 'Nothing received yet', 'prepaidAll' => 'Paid in full online. Collect nothing.',
            'confirm' => 'Confirm cash collected', 'shortHelp' => 'The amount is less than what is due.',
        ],
        'ar' => [
            'title' => 'الدفع عند الاستلام', 'orderTotal' => 'إجمالي الطلب', 'deliveryFee' => 'رسوم التوصيل', 'prepaid' => 'مدفوع إلكترونيًا', 'due' => 'المبلغ المستحق', 'collected' => 'النقد المستلم',
            'exact' => 'المبلغ مطابق', 'shortBy' => 'المتبقي', 'change' => 'الباقي للعميل', 'unpaid' => 'لم يُستلم شيء بعد', 'prepaidAll' => 'مدفوع بالكامل إلكترونيًا. لا تحصّل شيئًا.',
            'confirm' => 'تأكيد تحصيل النقد', 'shortHelp' => 'المبلغ أقل من المستحق.',
        ],
    ];
    $t = array_merge($strings[$ar ? 'ar' : 'en'], (array) $labels);
    $due = max(0, (int) round($orderTotalMinor) + (int) round($deliveryFeeMinor) - (int) round($prepaidMinor));
    $fullyPrepaid = $due === 0;
    $got = max(0, (int) round($collectedMinor ?? 0));
    $state = $collectedMinor === null || $got === 0 ? ($due === 0 ? 'exact' : 'unpaid') : ($got < $due ? 'short' : ($got === $due ? 'exact' : 'over'));
    $tone = $state === 'short' ? 'short' : ($state === 'over' ? 'over' : ($state === 'exact' && $got > 0 ? 'exact' : 'idle'));
    $canConfirm = $fullyPrepaid || ($got > 0 && ($allowShort || $got >= $due));
    $statusText = match ($tone) { 'over' => $t['change'].': ', 'short' => $t['shortBy'].': ', 'exact' => $t['exact'], default => $t['unpaid'] };
    $statusAmount = match ($tone) { 'over' => nq_delivery_money($got - $due, $code, $locale), 'short' => nq_delivery_money($due - $got, $code, $locale), default => '' };
    $quick = $quickAmounts;
    if ($quick === null) {
        $factor = 100;
        if (class_exists(\NumberFormatter::class)) {
            $probe = new \NumberFormatter('en', \NumberFormatter::CURRENCY);
            $probe->setTextAttribute(\NumberFormatter::CURRENCY_CODE, $code);
            $max = $probe->getAttribute(\NumberFormatter::MAX_FRACTION_DIGITS);
            $factor = is_int($max) && $max >= 0 ? 10 ** $max : 100;
        }
        $set = [$due];
        foreach ([10, 50, 100] as $step) {
            $up = (int) (ceil($due / ($step * $factor)) * $step * $factor);
            if ($up > $due && ! in_array($up, $set, true)) {
                $set[] = $up;
            }
        }
        $quick = array_slice(array_values(array_filter($set, fn ($v) => $v > 0)), 0, 4);
    }
    $uid ??= 'nq-cash-'.substr(md5(json_encode([$orderTotalMinor, $deliveryFeeMinor, $prepaidMinor, $code])), 0, 8);
    $rows = [['key' => 'total', 'label' => $t['orderTotal'], 'value' => $orderTotalMinor, 'negative' => false], ['key' => 'fee', 'label' => $t['deliveryFee'], 'value' => $deliveryFeeMinor, 'negative' => false]];
    if ($prepaidMinor > 0) {
        $rows[] = ['key' => 'prepaid', 'label' => $t['prepaid'], 'value' => $prepaidMinor, 'negative' => true];
    }
    $options = [
        'due' => $due,
        'currency' => $code,
        'locale' => str_replace('_', '-', $locale),
        'collected' => $collectedMinor,
        'allowShort' => (bool) $allowShort ?: null,
        'labels' => ['change' => $t['change'], 'shortBy' => $t['shortBy'], 'exact' => $t['exact'], 'unpaid' => $t['unpaid']],
    ];
    $options = array_filter($options, fn ($v) => $v !== null);
    $hide = 'style="display: none"';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'cash-collect') }}" x-bind:data-state="state" data-state="{{ $state }}" aria-labelledby="{{ $uid }}-title" x-data="nqCashCollect(@js($options))" x-modelable="collected"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-5') }}>
    <h2 id="{{ $uid }}-title" class="text-h3 text-foreground">{{ $t['title'] }}</h2>

    <dl data-slot="cash-breakdown" class="flex flex-col gap-2">
        @foreach ($rows as $row)
            <div class="flex items-baseline justify-between gap-3">
                <dt class="text-body-sm text-muted-foreground">{{ $row['label'] }}</dt>
                <dd class="tabular-nums text-body-sm text-foreground"><bdi>{{ $row['negative'] ? '−' : '' }}{{ nq_delivery_money($row['value'], $code, $locale) }}</bdi></dd>
            </div>
        @endforeach
        <div class="border-t border-border pt-2">
            <div class="flex items-baseline justify-between gap-3">
                <dt class="text-label text-foreground">{{ $t['due'] }}</dt>
                <dd class="tabular-nums text-h3 text-foreground"><bdi>{{ nq_delivery_money($due, $code, $locale) }}</bdi></dd>
            </div>
        </div>
    </dl>

    @if ($fullyPrepaid)
        <p role="status" class="flex items-center gap-2 rounded-control border border-nq-success/40 bg-nq-success-soft px-3 py-2 text-body-sm text-nq-success-text">
            <x-lucide-check aria-hidden="true" class="size-4 shrink-0" />
            {{ $t['prepaidAll'] }}
        </p>
    @else
        <div class="flex flex-col gap-2">
            <label for="{{ $uid }}-input" class="text-label text-foreground">{{ $t['collected'] }}</label>
            <x-nq::currency-input id="{{ $uid }}-input" x-model="collected" :value="$collectedMinor" :currency="$code" :locale="$locale" :min="0" />
            @if (count($quick) > 0)
                <div class="flex flex-wrap gap-2" role="group" aria-label="{{ $t['collected'] }}">
                    @foreach ($quick as $amount)
                        <x-nq::button type="button" size="sm" variant="secondary" x-bind:aria-pressed="collected === {{ $amount }}" aria-pressed="{{ $got === $amount && $collectedMinor !== null ? 'true' : 'false' }}"
                            x-on:click="pick({{ $amount }})"
                            class="aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary">
                            <bdi class="tabular-nums">{{ nq_delivery_money($amount, $code, $locale) }}</bdi>
                        </x-nq::button>
                    @endforeach
                </div>
            @endif
        </div>

        <p role="status" data-slot="cash-status" x-bind:data-tone="tone" data-tone="{{ $tone }}"
            class="flex items-center gap-2 rounded-control border px-3 py-2 text-body-sm data-[tone=short]:border-nq-warning/40 data-[tone=short]:bg-nq-warning-soft data-[tone=short]:text-nq-warning-text data-[tone=over]:border-nq-info/40 data-[tone=over]:bg-nq-info-soft data-[tone=over]:text-nq-info-text data-[tone=exact]:border-nq-success/40 data-[tone=exact]:bg-nq-success-soft data-[tone=exact]:text-nq-success-text data-[tone=idle]:border-border data-[tone=idle]:bg-secondary data-[tone=idle]:text-muted-foreground">
            <span x-show="tone === 'over'" aria-hidden="true" class="flex shrink-0 [&_svg]:size-4" @if ($tone !== 'over') {!! $hide !!} @endif><x-lucide-undo-2 /></span>
            <span x-show="tone === 'short'" aria-hidden="true" class="flex shrink-0 [&_svg]:size-4" @if ($tone !== 'short') {!! $hide !!} @endif><x-lucide-circle-alert /></span>
            <span x-show="tone === 'exact'" aria-hidden="true" class="flex shrink-0 [&_svg]:size-4" @if ($tone !== 'exact') {!! $hide !!} @endif><x-lucide-check /></span>
            <span x-show="tone === 'idle'" aria-hidden="true" class="flex shrink-0 [&_svg]:size-4" @if ($tone !== 'idle') {!! $hide !!} @endif><x-lucide-banknote /></span>
            <span><span x-text="statusText">{{ $statusText }}</span><bdi x-show="statusAmount" x-text="statusAmount" class="font-medium tabular-nums" @if ($statusAmount === '') {!! $hide !!} @endif>{{ $statusAmount }}</bdi></span>
            @unless ($allowShort)
                <span x-show="tone === 'short'" class="sr-only" @if ($tone !== 'short') {!! $hide !!} @endif>{{ $t['shortHelp'] }}</span>
            @endunless
        </p>
    @endif

    @if ($loading)
        <x-nq::button type="button" variant="primary" size="lg" loading x-on:click="confirm()">
            <x-lucide-check aria-hidden="true" />
            {{ $t['confirm'] }}
        </x-nq::button>
    @else
        {{-- Written out like <x-nq::button variant="primary" size="lg">: the button component prints disabled before the attributes, and Alpine ignores a bound attribute that follows a static one. --}}
        <button data-slot="button" type="button" x-bind:disabled="! canConfirm" x-bind:data-disabled="! canConfirm" @if (! $canConfirm) disabled data-disabled @endif x-on:click="confirm()"
            class="inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent font-sans transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--nq-action)_88%,var(--nq-fg))] h-[calc(var(--nq-control)+8px)] px-5 text-body">
            <x-lucide-check aria-hidden="true" />
            {{ $t['confirm'] }}
        </button>
    @endif
</section>

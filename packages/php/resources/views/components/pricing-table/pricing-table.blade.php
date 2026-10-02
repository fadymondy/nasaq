{{-- <x-nq::pricing-table :plans="$plans" current-plan-id="free" note="Prices in USD, excluding VAT. Cancel anytime." @nq-plan-select="checkout($event.detail)" />
     The pricing section: a Monthly / Yearly switch and one plan card per plan, built from data. Every card has a working button that knows the account's current plan, so people can subscribe, upgrade or downgrade here.
     plans: an array of plans, smallest first, up to four: ['id' => 'pro', 'name' => 'Pro', 'description' => '…', 'monthly' => 15, 'yearly' => 12 (per month, billed yearly), 'perSeat' => false, 'custom' => 'Custom' (shown instead of a price),
     'features' => ['…', ['label' => 'SSO', 'included' => false]], 'featuresTitle' => '…', 'badge' => 'Most popular', 'highlighted' => true, 'trialDays' => 14, 'cta' => 'Button label', 'footnote' => '…'].
     currency: ISO code (USD, or SAR in Arabic, when omitted). period: month | year, the one shown first; x-model works on it (x-modelable="period"). current-plan-id: the plan the account is on; its card says "Current plan", the others say Upgrade or Downgrade.
     hide-period-switch hides the switch (it is also hidden when no plan has a yearly price). note: one line under the plans (or the note slot). labels: overrides for the built-in strings.
     A plan's button dispatches the bubbling "nq-plan-select" with { planId, period, wait(promise) }: call event.detail.wait(promise) to keep the button busy until it settles (a checkout redirect). Period changes dispatch "nq-period-change" with { period }.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['plans', 'currency' => null, 'period' => 'month', 'currentPlanId' => null, 'hidePeriodSwitch' => false, 'note' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.pricing-table._pricing')
@php
    $locale ??= app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $t = nq_pricing_labels((array) $labels, $locale);
    $plans = array_values((array) $plans);
    $period = $period === 'year' ? 'year' : 'month';
    $hasYearly = count(array_filter($plans, fn ($p) => isset($p['yearly']))) > 0;
    $hasNote = $note !== null && trim((string) $note) !== '';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'pricing-table') }}" x-data="nqPricingTable(@js($period))" x-modelable="period" {{ $attributes->except('data-slot')->cn('flex flex-col items-center gap-8') }}>
    @if ($hasYearly && ! $hidePeriodSwitch)
        <x-nq::pricing-table.billing-period-switch :period="$period" :savings="nq_pricing_savings($plans)" :labels="$labels" x-model="sel" />
    @endif
    <div class="w-full">
        <x-nq::plan-card.grid>
            @foreach ($plans as $plan)
                @php
                    $action = nq_pricing_action($plan, $plans, $t, $currentPlanId);
                    $isCurrent = $currentPlanId !== null && ($plan['id'] ?? null) === $currentPlanId;
                    $noteMonth = nq_pricing_note($plan, 'month', $t, $code, $locale);
                    $noteYear = nq_pricing_note($plan, 'year', $t, $code, $locale);
                    $noteNow = $period === 'year' ? $noteYear : $noteMonth;
                    $id = "'".addcslashes((string) ($plan['id'] ?? ''), "'\\")."'";
                @endphp
                <x-nq::plan-card
                    :name="$plan['name'] ?? null"
                    :description="$plan['description'] ?? null"
                    :highlighted="(bool) ($plan['highlighted'] ?? false)"
                    :current="$isCurrent"
                    :badge="$isCurrent ? null : ($plan['badge'] ?? null)"
                    :features-title="$plan['featuresTitle'] ?? null"
                    :features="$plan['features'] ?? []"
                    :footnote="$plan['footnote'] ?? null">
                    <x-slot:price><x-nq::pricing-table.plan-price :plan="$plan" :period="$period" :currency="$code" reactive /></x-slot:price>
                    @if ($noteMonth !== $noteYear && ($noteMonth !== null || $noteYear !== null))
                        <x-slot:price-note>
                            <span x-show="period === 'month'" @if ($period !== 'month') style="display: none" @endif>{{ $noteMonth }}</span>
                            <span x-show="period === 'year'" @if ($period !== 'year') style="display: none" @endif>{{ $noteYear }}</span>
                        </x-slot:price-note>
                    @elseif ($noteNow !== null)
                        <x-slot:price-note>{{ $noteNow }}</x-slot:price-note>
                    @endif
                    <x-slot:action>
                        @if ($action['disabled'])
                            <x-nq::button size="lg" :variant="$action['variant']" disabled>{{ $action['label'] }}</x-nq::button>
                        @else
                            <x-nq::button size="lg" :variant="$action['variant']" x-bind:disabled="isBlocked({!! $id !!})" x-bind:data-disabled="isBlocked({!! $id !!})" x-bind:aria-busy="pending === {!! $id !!}" x-on:click="select({!! $id !!})">{{ $action['label'] }}</x-nq::button>
                        @endif
                    </x-slot:action>
                </x-nq::plan-card>
            @endforeach
        </x-nq::plan-card.grid>
    </div>
    @if ($hasNote)
        <p class="text-center text-caption text-muted-foreground">{{ $note }}</p>
    @endif
</div>

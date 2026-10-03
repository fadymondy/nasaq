{{-- <x-nq::upgrade-prompt title="Unlock unlimited projects" :benefits="['Unlimited projects']" :plans="$plans"> <x-nq::upgrade-prompt.trigger variant="primary">Upgrade</x-nq::upgrade-prompt.trigger> </x-nq::upgrade-prompt>
     The upgrade popup (UpgradeDialog): open it when someone hits a limit or reaches for a paid feature. It leads with what they get, shows the price and a way out ("Maybe later"), and goes straight to checkout.
     The default slot holds the trigger (<x-nq::upgrade-prompt.trigger>) or anything that calls show(). <x-slot:icon> replaces the sparkles in the hero. open: start open (x-modelable: x-model / wire:model work).
     title: what they get, not what they pay. description. benefits: three to five concrete wins (strings).
     plans: the plans on offer (the same arrays as <x-nq::pricing-table>); one shows its price, several show a plan picker. Leave out to show no price (the button then says "Upgrade now").
     default-plan-id: the plan picked first (default: the highlighted plan, else the first). current-plan-id: left out of the choices. currency: ISO code (USD, or SAR in Arabic, when omitted). default-period: month | year (default year).
     offer: ['label' => '30% off your first year', 'endsAt' => '2026-12-31T00:00:00Z'] (endsAt shows a live countdown). note: the reassurance under the button; hide-note hides it. cta: replaces the button label. labels: overrides for the built-in strings.
     The button dispatches the bubbling `nq-upgrade` with { planId, period, wait(promise) }: call event.detail.wait(promise) to keep it busy until the promise settles (a checkout redirect). `nq-period-change` fires when the period changes.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false, 'title' => null, 'description' => null, 'benefits' => [], 'plans' => [], 'defaultPlanId' => null, 'currentPlanId' => null, 'currency' => null, 'defaultPeriod' => 'year', 'offer' => null, 'note' => null, 'hideNote' => false, 'cta' => null, 'labels' => [], 'icon' => null])
@include('nasaq::components.pricing-table._pricing')
@include('nasaq::components.upgrade-prompt._strings')
@php
    $locale = app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $t = nq_upgrade_labels((array) $labels, $locale);
    $choices = array_values(array_filter((array) $plans, fn ($p) => ! ($currentPlanId !== null && ($p['id'] ?? null) === $currentPlanId)));
    $highlighted = null;
    foreach ($choices as $p) {
        if (! empty($p['highlighted'])) {
            $highlighted = $p;
            break;
        }
    }
    $firstId = $defaultPlanId ?? (($highlighted ?? ($choices[0] ?? null))['id'] ?? null);
    $hasYearly = count(array_filter($choices, fn ($p) => isset($p['yearly']))) > 0;
    $period = $hasYearly ? ($defaultPeriod === 'month' ? 'month' : 'year') : 'month';
    $current = null;
    foreach ($choices as $p) {
        if (($p['id'] ?? null) === $firstId) {
            $current = $p;
        }
    }
    $name = is_string($current['name'] ?? null) ? $current['name'] : '';
    $names = [];
    foreach ($choices as $p) {
        if (is_string($p['name'] ?? null)) {
            $names[$p['id']] = $p['name'];
        }
    }
    $options = ['open' => (bool) $open, 'planId' => $firstId, 'period' => $period, 'names' => (object) $names, 'upgradeTo' => $t['upgradeTo'], 'upgradeNow' => $t['upgradeNow']];
    $benefits = array_values((array) $benefits);
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $hasIcon = $icon && ! $icon->isEmpty();
    $savings = nq_pricing_savings($choices);
    $ctaInitial = $name !== '' ? nq_pricing_fill($t['upgradeTo'], ['name' => $name]) : $t['upgradeNow'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'upgrade-prompt') }}" x-data="nqUpgradePrompt({{ \Illuminate\Support\Js::from($options) }})" x-modelable="open" x-id="['nq-dialog']" {{ $attributes->except('data-slot')->cn('contents') }}>
    {{ $slot }}
    <template x-teleport="body">
        <div data-slot="dialog-portal">
            <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div data-slot="upgrade-dialog" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
                class="{{ \Nasaq\Cn::merge('fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg gap-4', 'rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none', 'max-h-[calc(100dvh-2rem)] overflow-y-auto', $fade, 'max-w-md gap-0 overflow-hidden p-0') }}">
                <div class="flex flex-col items-center gap-3 bg-[color-mix(in_oklab,var(--nq-brand)_12%,var(--nq-surface))] px-6 pt-8 pb-6 text-center">
                    <span class="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md [&_svg]:size-6">@if ($hasIcon){{ $icon }}@else<x-lucide-sparkles aria-hidden="true" />@endif</span>
                    <x-nq::dialog.title class="text-h3 text-foreground">{{ $title }}</x-nq::dialog.title>
                    @if (filled($description))<x-nq::dialog.description class="text-body-sm text-muted-foreground">{{ $description }}</x-nq::dialog.description>@endif
                </div>
                <div class="flex flex-col gap-5 p-6">
                    @if (count($benefits) > 0)
                        <ul class="flex flex-col gap-2.5">
                            @foreach ($benefits as $b)
                                <li class="flex items-start gap-2.5 text-body-sm text-foreground">
                                    <span class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-nq-success-soft text-nq-success-text"><x-lucide-check aria-hidden="true" class="size-3" stroke-width="3" /></span>
                                    {{ $b }}
                                </li>
                            @endforeach
                        </ul>
                    @endif

                    @if (count($choices) > 0)
                        <div class="flex flex-col gap-3">
                            @if ($hasYearly)
                                <div class="flex justify-center">
                                    <x-nq::pricing-table.billing-period-switch :period="$period" :savings="$savings" :labels="(array) $labels" x-model="sel" />
                                </div>
                            @endif
                            @if (count($choices) > 1)
                                <x-nq::radio-group data-slot="plan-picker" :default-value="$firstId" x-model="planId" class="flex flex-col gap-2">
                                    @foreach ($choices as $plan)
                                        @php
                                            $meta = new \Illuminate\Support\HtmlString(\Illuminate\Support\Facades\Blade::render('<x-nq::pricing-table.plan-price :plan="$plan" :period="$period" :currency="$code" :reactive="true" size="sm" />', ['plan' => $plan, 'period' => $period, 'code' => $code]));
                                        @endphp
                                        <x-nq::radio-group.card :value="$plan['id']" :description="$plan['description'] ?? null" :meta="$meta">
                                            <span class="flex flex-wrap items-center gap-2">
                                                {{ $plan['name'] ?? '' }}
                                                @if (! empty($plan['badge']))<x-nq::badge variant="brand" class="h-5 px-1.5">{{ $plan['badge'] }}</x-nq::badge>@endif
                                            </span>
                                        </x-nq::radio-group.card>
                                    @endforeach
                                </x-nq::radio-group>
                            @elseif ($current)
                                <div class="flex items-baseline justify-center gap-2">
                                    <x-nq::pricing-table.plan-price :plan="$current" :period="$period" :currency="$code" :reactive="true" size="lg" />
                                </div>
                            @endif
                        </div>
                    @endif

                    @if (is_array($offer) && ! empty($offer['label']))
                        <div class="flex flex-col items-center gap-1 rounded-control bg-nq-accent/10 px-3 py-2 text-center">
                            <span class="text-label text-nq-accent-text">{{ $offer['label'] }}</span>
                            @if (! empty($offer['endsAt']))
                                <span class="inline-flex items-center gap-1.5 text-caption text-muted-foreground" x-data="nqOfferClock({{ \Illuminate\Support\Js::from(['endsAt' => (string) $offer['endsAt'], 'days' => $t['days']]) }})">
                                    <x-lucide-clock aria-hidden="true" class="size-3.5" />
                                    {{ $t['endsIn'] }}
                                    <span dir="ltr" class="font-mono text-foreground tabular-nums" role="timer" aria-live="off" x-text="text">--:--:--</span>
                                </span>
                            @endif
                        </div>
                    @endif

                    <div class="flex flex-col gap-2">
                        <x-nq::button variant="primary" size="lg" x-on:click="upgrade()" x-bind:aria-busy="pending ? 'true' : null" x-bind:disabled="pending">
                            @if (filled($cta)){{ $cta }}@else<span x-text="ctaLabel">{{ $ctaInitial }}</span>@endif
                        </x-nq::button>
                        <x-nq::dialog.close variant="ghost">{{ $t['later'] }}</x-nq::dialog.close>
                    </div>
                    @unless ($hideNote)
                        <p class="flex items-center justify-center gap-1.5 text-center text-caption text-muted-foreground">
                            <x-lucide-shield-check aria-hidden="true" class="size-3.5 shrink-0" />
                            {{ $note ?? $t['cancelAnytime'] }}
                        </p>
                    @endunless
                </div>
                <button type="button" data-slot="dialog-close" x-on:click="close()" aria-label="{{ \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                    class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
            </div>
        </div>
    </template>
</div>

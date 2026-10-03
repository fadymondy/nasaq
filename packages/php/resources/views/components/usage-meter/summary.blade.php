{{-- <x-nq::usage-meter.summary plan-name="Team" currency="USD" :items="[['id' => 'seats', 'label' => 'Seats', 'used' => 46, 'limit' => 50, 'unit' => 'seats']]" />
     The plan usage section: every metered resource against the plan, then a strip with the estimated overage and a line per item that went over.
     items: array of ['id', 'label', 'used', 'limit' (null is unlimited), 'kind', 'unit', 'overageRate', 'hint']. period: "1 Sep to 30 Sep". currency: default USD, SAR in Arabic.
     upgradable: shows Upgrade plan (it dispatches a bubbling "nq-upgrade", needs the Alpine runtime) when something is near or over its limit.
     loading: skeleton layout. labels: array overriding the built-in words. --}}
@include('nasaq::components.usage-meter._logic')
@props(['planName' => null, 'period' => null, 'items' => [], 'currency' => null, 'thresholds' => [], 'upgradable' => false, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_um_words($locale, $labels);
    $currency ??= \Nasaq\Nasaq::currency($locale);
    $money = fn ($n) => nq_um_amount($n, 'money', $locale, $t, null, $currency);
    $total = array_sum(array_map('nq_um_overage', $items));
    $over = array_values(array_filter($items, fn ($i) => nq_um_overage($i) > 0));
    $pressed = count(array_filter($items, fn ($i) => nq_um_tone($i['used'], $i['limit'] ?? null, $thresholds) !== 'ok')) > 0;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'usage-summary') }}" @if ($loading) aria-busy="true" @endif {{ $attributes->except('data-slot')->cn("flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground") }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3" class="flex items-center gap-2">
            {{ $t['planUsage'] }}
            <x-nq::badge variant="brand">{{ is_string($planName) ? nq_um_fill($t['plan'], $planName) : $planName }}</x-nq::badge>
        </x-nq::card.title>
        <x-nq::card.description>{{ $period ?? $t['period'] }}</x-nq::card.description>
        @if ($upgradable && $pressed)
            <x-nq::card.action>
                <x-nq::button variant="primary" size="sm" x-on:click="$dispatch('nq-upgrade')">
                    <x-lucide-zap />
                    {{ $t['upgrade'] }}
                </x-nq::button>
            </x-nq::card.action>
        @endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-5">
        @if ($loading)
            <div role="status" aria-label="{{ $t['loading'] }}" class="grid gap-5 sm:grid-cols-2">
                @for ($i = 0; $i < 4; $i++)
                    <div class="flex flex-col gap-2">
                        <x-nq::states.skeleton class="h-3.5 w-28" />
                        <x-nq::states.skeleton class="h-2 w-full" />
                    </div>
                @endfor
            </div>
        @else
            <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                @foreach ($items as $item)
                    <x-nq::usage-meter :label="$item['label']" :used="$item['used']" :limit="$item['limit'] ?? null" :kind="$item['kind'] ?? 'count'" :unit="$item['unit'] ?? null" :currency="$currency" :hint="$item['hint'] ?? null" :thresholds="$thresholds" :labels="$labels" :locale="$locale" />
                @endforeach
            </div>
            <div data-slot="usage-overage-strip" data-tone="{{ $total > 0 ? 'warning' : 'success' }}" role="{{ $total > 0 ? 'alert' : 'status' }}" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border p-3 text-start {{ $total > 0 ? 'border-nq-warning/30 bg-nq-warning-soft' : 'border-nq-success/30 bg-nq-success-soft' }}">
                @if ($total > 0)
                    <x-lucide-circle-alert aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-warning-text" />
                @else
                    <x-lucide-circle-check aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-success-text" />
                @endif
                <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5">
                    @if ($total > 0)
                        <div data-slot="alert-description" class="text-body-sm text-foreground">
                            <div class="flex flex-col gap-1">
                                <div class="flex flex-wrap items-baseline gap-x-2">
                                    <span class="text-label">{{ $t['overageTitle'] }}</span>
                                    <bdi data-slot="usage-overage-total" class="text-h3 tabular-nums">{{ $money($total) }}</bdi>
                                </div>
                                <span>{{ $t['overageBody'] }}</span>
                                <ul class="mt-1 flex flex-col gap-0.5 text-caption">
                                    @foreach ($over as $i)
                                        <li>{{ nq_um_fill($t['overageLine'], is_string($i['label']) ? $i['label'] : $i['id'], nq_um_amount($i['used'] - ($i['limit'] ?? 0), $i['kind'] ?? 'count', $locale, $t, $i['unit'] ?? null, $currency), $money(nq_um_overage($i))) }}</li>
                                    @endforeach
                                </ul>
                            </div>
                        </div>
                    @else
                        <div data-slot="alert-title" class="text-label text-foreground">{{ $t['overageNone'] }}</div>
                        <div data-slot="alert-description" class="text-body-sm text-muted-foreground">{{ $t['overageNoneBody'] }}</div>
                    @endif
                </div>
            </div>
        @endif
    </x-nq::card.content>
</div>

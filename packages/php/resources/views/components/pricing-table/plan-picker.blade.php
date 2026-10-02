{{-- <x-nq::pricing-table.plan-picker :plans="$plans" default-value="pro" class="max-w-md" />
     Plans as a compact list of radio cards, for an upgrade dialog, checkout or onboarding, where full cards do not fit.
     plans: the same plan arrays as <x-nq::pricing-table>. default-value: the plan id selected at first. x-model / wire:model binds the selected plan id (the radio group's value).
     currency: ISO code (USD, or SAR in Arabic, when omitted). period: month | year. current-plan-id: the account's plan: shown, but not selectable. labels: overrides for the built-in strings.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['plans', 'defaultValue' => null, 'currency' => null, 'period' => 'month', 'currentPlanId' => null, 'labels' => []])
@include('nasaq::components.pricing-table._pricing')
@php
    $locale = app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $t = nq_pricing_labels((array) $labels, $locale);
@endphp
<x-nq::radio-group data-slot="{{ $attributes->get('data-slot', 'plan-picker') }}" :default-value="$defaultValue" {{ $attributes->except('data-slot')->cn('flex flex-col gap-2') }}>
    @foreach ((array) $plans as $plan)
        @php
            $isCurrent = $currentPlanId !== null && ($plan['id'] ?? null) === $currentPlanId;
            $meta = new \Illuminate\Support\HtmlString(\Illuminate\Support\Facades\Blade::render('<x-nq::pricing-table.plan-price :plan="$plan" :period="$period" :currency="$code" size="sm" />', ['plan' => $plan, 'period' => $period, 'code' => $code]));
        @endphp
        <x-nq::radio-group.card :value="$plan['id']" :description="$plan['description'] ?? null" :meta="$meta" :data-disabled="$isCurrent ? '' : null" x-bind:disabled="{{ $isCurrent ? 'true' : 'false' }}">
            <span class="flex flex-wrap items-center gap-2">
                {{ $plan['name'] ?? '' }}
                @if ($isCurrent)
                    <x-nq::badge variant="outline" class="h-5 px-1.5">{{ $t['current'] }}</x-nq::badge>
                @elseif (! empty($plan['badge']))
                    <x-nq::badge variant="brand" class="h-5 px-1.5">{{ $plan['badge'] }}</x-nq::badge>
                @endif
            </span>
        </x-nq::radio-group.card>
    @endforeach
</x-nq::radio-group>

{{-- <x-nq::pricing-table.plan-comparison :plans="$plans" :sections="$sections" caption="Plan comparison" />
     Every feature, plan by plan. The header with the plan names and prices stays on screen while you scroll.
     plans: the same plan arrays as <x-nq::pricing-table>. sections: [['title' => 'Projects', 'rows' => [['label' => 'Projects', 'hint' => '…', 'values' => ['free' => '3', 'pro' => 'Unlimited', 'ent' => true]]]]].
     A value of true is a check, false or missing a dash, anything else is shown as is ("10 GB").
     currency: ISO code (USD, or SAR in Arabic, when omitted). period: month | year. current-plan-id: the account's plan. caption: the table's accessible name. labels: overrides for the built-in strings.
     With select the header gets each plan's button (it dispatches the bubbling "nq-plan-select" with { planId, period }); needs the Alpine runtime (@nasaqScripts). --}}
@props(['plans', 'sections', 'currency' => null, 'period' => 'month', 'currentPlanId' => null, 'select' => false, 'caption' => null, 'labels' => []])
@include('nasaq::components.pricing-table._pricing')
@php
    $locale = app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $t = nq_pricing_labels((array) $labels, $locale);
    $plans = array_values((array) $plans);
    $tint = 'bg-[color-mix(in_oklab,var(--nq-brand)_7%,transparent)]';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'plan-comparison') }}" @if ($select) x-data @endif {{ $attributes->except('data-slot')->cn('w-full overflow-x-auto') }}>
    <table class="w-full min-w-[40rem] border-separate border-spacing-0 text-start">
        @if ($caption)<caption class="sr-only">{{ $caption }}</caption>@endif
        <thead class="sticky top-0 z-1 bg-background">
            <tr>
                <th scope="col" class="w-[28%] border-b border-border p-3 text-start align-bottom text-label text-muted-foreground">{{ $t['feature'] }}</th>
                @foreach ($plans as $plan)
                    @php $hl = (bool) ($plan['highlighted'] ?? false); @endphp
                    <th scope="col" @if ($hl) data-highlighted="true" @endif class="{{ \Nasaq\Cn::merge('border-b border-border p-3 text-center align-bottom font-normal', $hl ? $tint : '') }}">
                        <div class="flex flex-col items-center gap-2">
                            <span class="text-h4 text-foreground">{{ $plan['name'] ?? '' }}</span>
                            <x-nq::pricing-table.plan-price :plan="$plan" :period="$period" :currency="$code" size="sm" />
                            @if ($select)
                                @php
                                    $action = nq_pricing_action($plan, $plans, $t, $currentPlanId);
                                    $id = "'".addcslashes((string) ($plan['id'] ?? ''), "'\\")."'";
                                @endphp
                                <x-nq::button size="sm" :variant="$action['variant']" :disabled="$action['disabled']" class="h-auto min-h-8 w-full max-w-44 whitespace-normal py-1 leading-tight text-balance"
                                    x-on:click="$dispatch('nq-plan-select', { planId: {!! $id !!}, period: '{{ $period }}' })">{{ $action['label'] }}</x-nq::button>
                            @endif
                        </div>
                    </th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($sections as $section)
                @if (! empty($section['title']))
                    <tr><th scope="colgroup" colspan="{{ count($plans) + 1 }}" class="px-3 pt-6 pb-2 text-start text-label text-foreground">{{ $section['title'] }}</th></tr>
                @endif
                @foreach ($section['rows'] ?? [] as $row)
                    <tr class="hover:bg-nq-hover/50">
                        <th scope="row" class="border-b border-border px-3 py-2.5 text-start text-body-sm font-normal text-foreground">
                            @if (! empty($row['hint']))
                                <x-nq::tooltip :content="$row['hint']"><span tabindex="0" class="cursor-help underline decoration-nq-line decoration-dotted underline-offset-4">{{ $row['label'] }}</span></x-nq::tooltip>
                            @else
                                {{ $row['label'] }}
                            @endif
                        </th>
                        @foreach ($plans as $plan)
                            @php $v = $row['values'][$plan['id'] ?? ''] ?? null; @endphp
                            <td class="{{ \Nasaq\Cn::merge('border-b border-border px-3 py-2.5 text-center', ! empty($plan['highlighted']) ? $tint : '') }}">
                                @if ($v === true)
                                    <x-lucide-check aria-hidden="true" class="mx-auto size-4 text-nq-brand" />
                                    <span class="sr-only">{{ $t['included'] }}</span>
                                @elseif ($v === false || $v === null)
                                    <x-lucide-minus aria-hidden="true" class="mx-auto size-4 text-muted-foreground/60" />
                                    <span class="sr-only">{{ $t['notIncluded'] }}</span>
                                @else
                                    <span class="text-body-sm text-foreground">{{ $v }}</span>
                                @endif
                            </td>
                        @endforeach
                    </tr>
                @endforeach
            @endforeach
        </tbody>
    </table>
</div>

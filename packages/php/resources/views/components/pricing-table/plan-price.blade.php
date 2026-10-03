{{-- <x-nq::pricing-table.plan-price :plan="$plan" period="month" />
     Internal: the price of one plan in one period (or its custom text). plan: the plan array. period: month | year. currency: ISO code (USD, or SAR in Arabic, when omitted). size: sm | md | lg.
     reactive: inside <x-nq::pricing-table> both periods are rendered and the inactive one is hidden, so the Monthly / Yearly switch changes it with no round trip. --}}
@props(['plan', 'period' => 'month', 'currency' => null, 'size' => 'lg', 'reactive' => false])
@include('nasaq::components.pricing-table._pricing')
@php
    $locale = app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $custom = isset($plan['custom']);
    $variants = ($reactive && ! $custom && nq_pricing_price($plan, 'month') != nq_pricing_price($plan, 'year')) ? ['month', 'year'] : [$period];
    $wrap = count($variants) > 1;
@endphp
@foreach ($variants as $p)
    @php $price = nq_pricing_price($plan, $p); @endphp
    @if ($wrap)<span class="contents" x-show="period === '{{ $p }}'" @if ($p !== $period) style="display: none" @endif>@endif
    @if ($custom)
        <span class="{{ \Nasaq\Cn::merge('text-foreground', $size === 'lg' ? 'text-h2 font-semibold tracking-tight' : 'font-medium') }}">{{ $plan['custom'] }}</span>
    @elseif ($price)
        <x-nq::price :amount="$price['amount']" :compare-at="$price['compareAt']" :currency="$code" :period="! empty($plan['perSeat']) ? 'seat-month' : 'month'" :size="$size" />
    @endif
    @if ($wrap)</span>@endif
@endforeach

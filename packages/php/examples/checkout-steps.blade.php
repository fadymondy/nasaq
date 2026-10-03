@php
    $plans = [
        ['id' => 'starter', 'name' => 'Starter', 'monthlyPrice' => 19, 'yearlyPrice' => 190, 'features' => ['3 projects']],
        ['id' => 'team', 'name' => 'Team', 'monthlyPrice' => 49, 'yearlyPrice' => 490, 'badge' => 'Most popular', 'highlighted' => true],
    ];
@endphp
{{-- In a real page the handler posts the order to your server and settles the payment with the receipt number. --}}
<div x-data="{ async charge({ order, resolve, reject }) {
        try {
            await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify(order) });
            resolve({ reference: 'SUB-1042' });
        } catch (e) {
            reject(e);
        }
    } }"
    x-on:nq-checkout-complete.prevent="charge($event.detail)">
    <x-nq::checkout-steps :plans="$plans" currency="USD" :tax-rate="0.15" tax-label="VAT" />
</div>

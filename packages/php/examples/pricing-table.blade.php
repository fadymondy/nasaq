@php
    $plans = [
        ['id' => 'free', 'name' => 'Free', 'description' => 'For trying it out.', 'monthly' => 0, 'features' => ['3 projects', 'Community support']],
        [
            'id' => 'pro',
            'name' => 'Pro',
            'description' => 'For growing teams.',
            'monthly' => 15,
            'yearly' => 12, // per month, billed yearly
            'highlighted' => true,
            'badge' => 'Most popular',
            'trialDays' => 14,
            'featuresTitle' => 'Everything in Free, plus',
            'features' => ['Unlimited projects', 'Priority support'],
        ],
        ['id' => 'enterprise', 'name' => 'Enterprise', 'custom' => 'Custom', 'features' => ['SSO', 'SLA']],
    ];
    $sections = [['title' => 'Projects', 'rows' => [
        ['label' => 'Projects', 'values' => ['free' => '3', 'pro' => 'Unlimited', 'enterprise' => 'Unlimited']],
        ['label' => 'SSO', 'values' => ['enterprise' => true]],
    ]]];
@endphp
<div class="flex flex-col gap-10">
    <x-nq::pricing-table :plans="$plans" note="Prices in USD, excluding VAT. Cancel anytime." x-on:nq-plan-select="console.log('checkout', $event.detail.planId, $event.detail.period)" />
    <x-nq::pricing-table.plan-comparison :plans="$plans" :sections="$sections" caption="Plan comparison" />
    <x-nq::pricing-table.plan-picker :plans="$plans" default-value="pro" class="max-w-md" />
</div>

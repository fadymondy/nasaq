@php
    $plans = [
        ['id' => 'team', 'name' => 'Team', 'monthly' => 15, 'yearly' => 12, 'highlighted' => true, 'description' => 'Everything your team needs'],
        ['id' => 'business', 'name' => 'Business', 'monthly' => 40, 'yearly' => 32, 'description' => 'Advanced controls'],
    ];
@endphp
<div class="flex flex-col gap-4">
    <x-nq::upgrade-prompt.banner tone="warning" dismissible title="Your trial ends in 3 days" description="Pick a plan to keep your projects.">
        <x-slot:action><x-nq::button size="sm" variant="primary">Choose a plan</x-nq::button></x-slot:action>
    </x-nq::upgrade-prompt.banner>
    <x-nq::upgrade-prompt.feature-gate :locked="true" title="Custom reports are on Team">
        <div class="h-24 rounded-card bg-muted p-4">Revenue by month</div>
    </x-nq::upgrade-prompt.feature-gate>
    <x-nq::upgrade-prompt title="Unlock unlimited projects" description="You have used all 3 projects on the free plan." :benefits="['Unlimited projects', 'Priority support', 'Advanced reports']" :plans="$plans">
        <x-nq::upgrade-prompt.trigger variant="primary">Upgrade</x-nq::upgrade-prompt.trigger>
    </x-nq::upgrade-prompt>
</div>

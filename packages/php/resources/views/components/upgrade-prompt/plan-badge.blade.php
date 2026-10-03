{{-- <x-nq::upgrade-prompt.plan-badge>Team</x-nq::upgrade-prompt.plan-badge>
     Marks a feature, menu item or setting as part of a paid plan. The slot is the plan's name (default "Pro" / "احترافي"). --}}
@include('nasaq::components.upgrade-prompt._strings')
<x-nq::badge data-slot="{{ $attributes->get('data-slot', 'plan-badge') }}" variant="brand" {{ $attributes->except('data-slot')->cn('gap-1') }}>
    <x-lucide-sparkles aria-hidden="true" class="size-3" />
    {{ $slot->isEmpty() ? nq_upgrade_labels()['pro'] : $slot }}
</x-nq::badge>

<div class="flex flex-col gap-6">
    <x-nq::data-state :empty="true">
        <x-slot:emptyAction><x-nq::button variant="primary" size="sm">New order</x-nq::button></x-slot:emptyAction>
    </x-nq::data-state>
    <x-nq::data-state :unavailable="true" :retry="['wire:click' => 'load']" />
    <x-nq::data-state error="The orders request timed out." />
    <x-nq::data-state :unauthorized="true" sign-in-href="/login" />
    <x-nq::data-state><ul><li>Order 1042</li></ul></x-nq::data-state>
</div>

{{-- Your save and finish calls. Resolve { error: "…" } to keep the person on the step. --}}
<x-nq::setup-wizard title="Set up your workspace" :completed="['name']" :can-finish="false" gate-message="Connect an agent first."
    :steps="[['id' => 'name', 'title' => 'Name'], ['id' => 'agent', 'title' => 'Agent']]"
    x-on:nq-step-complete="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 200)))"
    x-on:nq-finish="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 200)))">
    <x-nq::setup-wizard.step id="name">
        <input aria-label="Name" class="h-control rounded-control border border-border bg-background px-3" />
    </x-nq::setup-wizard.step>
    <x-nq::setup-wizard.step id="agent">
        <x-nq::setup-wizard.agent-enroll command="curl -fsSL https://get.example.com | sh" status="waiting" :elapsed="75" x-on:nq:retry="$dispatch('nq-agent-status', { status: 'waiting', elapsed: 0 })" />
    </x-nq::setup-wizard.step>
    <x-slot:done-action><x-nq::button href="/">Open the dashboard</x-nq::button></x-slot:done-action>
</x-nq::setup-wizard>

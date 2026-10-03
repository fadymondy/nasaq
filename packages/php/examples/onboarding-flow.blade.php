{{-- Your save, connect and finish calls. Resolve { error: "…" } to keep the person on the step. --}}
<x-nq::onboarding-flow user-name="Sara" storage-key="onboarding:u1"
    x-on:nq-onboarding-save="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 50)))"
    x-on:nq-onboarding-connect="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 50)))"
    x-on:nq-onboarding-finish="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 50)))">
    <x-slot:done-action><x-nq::button href="/">Open the dashboard</x-nq::button></x-slot:done-action>
</x-nq::onboarding-flow>

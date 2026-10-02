{{-- Your listener checks the password and then calls unlock(); the lock-screen here accepts "123456" for the docs. --}}
<x-nq::idle-lock :timeout-seconds="600" :warning-seconds="30">
    <x-slot:lock-screen>
        <x-nq::lock-screen :user="['name' => 'Nour Adel']" :methods="['password']" now="2026-09-29T09:00:00"
            x-on:nq-lock-unlock="$event.detail.waitUntil(new Promise((done) => setTimeout(() => { $event.detail.secret === '123456' ? unlock() : null; done($event.detail.secret === '123456' ? undefined : { error: 'Wrong password.' }); }, 100)))" />
    </x-slot:lock-screen>
    <p>The app</p>
    <x-nq::button type="button" variant="secondary" x-on:click="lock()">Lock</x-nq::button>
</x-nq::idle-lock>

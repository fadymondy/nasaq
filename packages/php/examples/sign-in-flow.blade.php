{{-- Your listener picks the step for an address and checks the password (try "wrong"). --}}
<div class="w-96">
    <x-nq::sign-in-flow password forgot
        x-on:nq-sign-in-password="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.password === 'wrong' ? { error: 'Wrong email or password.' } : undefined), 200)))" />
</div>

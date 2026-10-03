{{-- Your API call. Resolve { error } for a wrong code (the input clears and refocuses); the demo accepts 123456. --}}
<div class="w-80">
    <x-nq::two-factor-challenge :passkey="true"
        x-on:nq-two-factor="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.code === '123456' || $event.detail.code === 'abcd-1234' ? undefined : { error: 'That code is not right, or it expired.' }), 300)))">
        <x-slot:footer><a href="/login" class="underline underline-offset-2">Back to sign in</a></x-slot:footer>
    </x-nq::two-factor-challenge>
</div>

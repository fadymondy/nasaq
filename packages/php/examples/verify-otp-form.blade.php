{{-- Your API calls. Resolve { error } for a wrong code (the boxes clear and refocus); the demo accepts 123456. --}}
<div class="w-80">
    <x-nq::verify-otp-form destination="fady@example.com" resend
        x-on:nq-verify-otp="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.code === '123456' ? undefined : { error: 'That code is not right.' }), 300)))"
        x-on:nq-verify-otp-resend="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))">
        <x-slot:footer><a href="/login" class="underline underline-offset-2">Use a different email</a></x-slot:footer>
    </x-nq::verify-otp-form>
</div>

{{-- Your sign-up call. Resolve { fieldErrors: { email: "…" } } when the address is taken. --}}
<div class="w-80">
    <x-nq::register-form :oauth-providers="['google', 'github']"
        x-on:nq-register="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.email === 'taken@example.com' ? { fieldErrors: { email: 'This email is already registered.' } } : undefined), 300)))">
        <x-slot:terms>I agree to the <a href="/terms" class="underline underline-offset-2">Terms</a> and <a href="/privacy" class="underline underline-offset-2">Privacy Policy</a></x-slot:terms>
    </x-nq::register-form>
</div>

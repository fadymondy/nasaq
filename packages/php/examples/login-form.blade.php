{{-- Your sign-in call. Resolve { error: "…" } for a wrong password; the magic link is optional. --}}
<div class="w-80">
    <x-nq::login-form :methods="['password', 'magic-link']" :oauth-providers="['google', 'github']" :passkey="true"
        x-on:nq-login="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.password === 'correct-horse' ? undefined : { error: 'Incorrect email or password.' }), 300)))"
        x-on:nq-magic-link="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))">
        <x-slot:forgot-password><a href="/forgot-password" class="underline underline-offset-2">Forgot password?</a></x-slot:forgot-password>
    </x-nq::login-form>
</div>

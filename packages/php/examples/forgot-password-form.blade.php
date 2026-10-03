{{-- Your API call. Resolve nothing and the form shows "Check your inbox" with a resend button on a cooldown. --}}
<div class="w-80">
    <x-nq::forgot-password-form
        x-on:nq-forgot-password="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))" />
</div>

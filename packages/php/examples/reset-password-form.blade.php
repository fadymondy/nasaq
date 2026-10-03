{{-- Your API call. Resolve nothing for success, or { expired: true } when the link was used or is too old. --}}
<div class="w-80">
    <x-nq::reset-password-form rules sign-in="/login" request-link="/forgot-password"
        x-on:nq-reset-password="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.password.includes('expired') ? { expired: true } : undefined), 300)))" />
</div>

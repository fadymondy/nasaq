{{-- Your API call. Resolve { fieldErrors: { currentPassword: "…" } } for a wrong current password. --}}
<x-nq::change-password-form
    x-on:nq-change-password="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.currentPassword === 'correct-horse' ? undefined : { fieldErrors: { currentPassword: 'That is not your current password.' } }), 300)))" />

{{-- Your listener checks the secret; resolve { error } for a wrong one. The clock is frozen here (docs); leave `now` out for a live clock. --}}
<x-nq::lock-screen :user="['name' => 'Nour Adel', 'email' => 'nour@example.com']" :methods="['pin', 'password']" now="2026-09-29T09:00:00" sign-out switch-account
    :accounts="[['name' => 'Omar Khalid', 'email' => 'omar@example.com']]" :max-attempts="3" :lockout-seconds="30"
    x-on:nq-lock-unlock="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.secret === '123456' ? undefined : { error: $event.detail.method === 'password' ? 'That is not right. Try again.' : undefined, fieldErrors: {} }), 200)))" />

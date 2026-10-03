{{-- Your sign-in call. Resolve { error } for a wrong password. The clock is frozen here (docs); leave `now` out for a live clock. --}}
<x-nq::desktop-login-screen title="ToGO OS" now="2026-09-29T09:00:00"
    :power-actions="[['id' => 'sleep', 'label' => 'Sleep', 'icon' => 'moon'], ['id' => 'shutdown', 'label' => 'Shut down', 'icon' => 'power']]"
    x-on:nq-login="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.password === 'correct-horse' ? undefined : { error: 'Incorrect email or password.' }), 300)))" />

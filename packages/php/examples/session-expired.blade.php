{{-- Your listener checks the password; resolve { error } for a wrong one (try "wrong"). --}}
<div class="w-80">
    <x-nq::session-expired :user="['name' => 'Nour Adel', 'email' => 'nour@example.com']" require-code keeps-work passkey switch-account sign-out
        x-on:nq-session-expired="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.password === 'wrong' ? { error: 'That password is not right.' } : undefined), 300)))"
        x-on:nq-session-sign-out="location.assign('/logout')" />
</div>

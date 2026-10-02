{{-- Your listeners call your API; resolve { error } to show a failure. The clock is frozen here (docs); leave `now` out for a live one. --}}
<div class="flex flex-col gap-8">
    <x-nq::device-pairing :request="['code' => 'WDJBMJHT', 'client' => 'Mahaam Desktop', 'deviceName' => 'Fady MacBook Pro', 'platform' => 'macOS 15', 'ip' => '203.0.113.7', 'location' => 'Riyadh, Saudi Arabia', 'requestedAt' => '2026-09-29T08:58:00', 'scopes' => ['Read your projects', 'Log time']]"
        now="2026-09-29T09:00:00" expires-at="2026-09-29T09:10:00" enter-another
        x-on:nq-device-approve="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))"
        x-on:nq-device-deny="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done({ error: 'Could not deny right now.' }), 300)))" />

    <x-nq::device-pairing.entry default-code="wdjb"
        x-on:nq-device-code="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done($event.detail.code === 'WDJBMJHT' ? undefined : { error: 'That code is not valid.' }), 200)))" />

    <x-nq::device-pairing.display code="WDJBMJHT" verification-uri="https://nasaq.app/device" verification-uri-complete="https://nasaq.app/device?user_code=WDJBMJHT"
        now="2026-09-29T09:00:00" expires-at="2026-09-29T09:10:00" refresh />

    <x-nq::device-pairing.handoff app-name="Mahaam Desktop" href="mahaam://auth/callback?token=abc" state="failed" fallback-code="WDJBMJHT" browser-href="/app" cancel />
</div>

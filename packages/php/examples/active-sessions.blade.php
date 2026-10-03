@php
    $sessions = [
        ['id' => '2', 'device' => 'Safari on iPhone', 'kind' => 'mobile', 'ip' => '41.33.80.2', 'location' => 'Alexandria, Egypt', 'lastActiveAt' => now()->startOfDay()->subHours(5)],
        ['id' => '1', 'device' => 'Chrome on macOS', 'kind' => 'desktop', 'ip' => '41.33.12.9', 'location' => 'Cairo, Egypt', 'lastActiveAt' => now()->startOfDay()->subMinute(), 'current' => true],
        ['id' => '3', 'device' => 'Firefox on Windows', 'kind' => 'desktop', 'ip' => '102.44.7.31', 'location' => 'Riyadh, Saudi Arabia', 'lastActiveAt' => now()->startOfDay()->subHours(48)],
    ];
@endphp
{{-- Your API calls; the dialog waits for them. Resolve { error: "…" } or reject to keep it open. --}}
<x-nq::active-sessions :sessions="$sessions"
    x-on:nq-session-revoke="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))"
    x-on:nq-session-revoke-others="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))" />

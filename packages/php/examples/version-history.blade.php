@php
    $versions = [
        ['id' => 'v3', 'version' => 3, 'savedAt' => now()->startOfDay()->subMinutes(30), 'author' => 'Sara', 'note' => 'Raised the free tier limit', 'content' => "{\n  \"plan\": \"free\",\n  \"limit\": 200,\n  \"currency\": \"USD\"\n}"],
        ['id' => 'v2', 'version' => 2, 'savedAt' => now()->startOfDay()->subDay(), 'author' => 'Omar', 'note' => 'Added currency', 'content' => "{\n  \"plan\": \"free\",\n  \"limit\": 100,\n  \"currency\": \"USD\"\n}"],
        ['id' => 'v1', 'version' => 1, 'savedAt' => now()->startOfDay()->subDays(2), 'author' => 'Sara', 'content' => "{\n  \"plan\": \"free\",\n  \"limit\": 100\n}"],
    ];
@endphp
{{-- Your API call saves the restore as a new version; the dialog waits for it. Resolve { error: "…" } or reject to show why it failed. --}}
<x-nq::version-history :versions="$versions" language="json" restorable
    x-on:nq-version-restore="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))" />

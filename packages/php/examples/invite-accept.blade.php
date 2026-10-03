{{-- You resolve the link and pass its state; join() is your API call. Resolve { error } to show a failure. --}}
<x-nq::invite-accept state="valid" :workspace="['name' => 'Sahab Studio', 'meta' => '12 members']" :invited-by="['name' => 'Sara Alharbi']" role="Admin"
    invite-email="omar@example.com" expires-at="2026-10-06" :account="['name' => 'Omar Khalid', 'email' => 'omar@example.com']" decline
    x-on:nq-invite-accept="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))"
    x-on:nq-invite-decline="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done({ error: 'Could not decline right now.' }), 300)))" />

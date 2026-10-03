{{-- Your listeners call your API; resolve { error } to show a failure. --}}
<x-nq::oauth-consent :app="['name' => 'Zapline', 'publisher' => 'by Zapline Inc.']" :account="['name' => 'Fady Mondy', 'email' => 'fady@example.com']"
    :scopes="[['id' => 'profile', 'label' => 'Read your profile'], ['id' => 'write', 'label' => 'Edit tasks', 'sensitive' => true]]" redirect-host="app.zapline.io" :heading-level="1"
    x-on:nq-oauth-allow="$event.detail.waitUntil(new Promise((done) => setTimeout(done, 300)))"
    x-on:nq-oauth-deny="$event.detail.waitUntil(new Promise((done) => setTimeout(() => done({ error: 'Could not deny right now.' }), 300)))" />

@php
    $identities = [
        ['id' => 'a1', 'channel' => 'email', 'value' => 'sara@example.com', 'label' => 'Work', 'primary' => true, 'verified' => true],
        ['id' => 'a2', 'channel' => 'email', 'value' => 'sara.k@home.example'],
        ['id' => 'a3', 'channel' => 'phone', 'value' => '+201001234567', 'primary' => true],
    ];
    $consent = [
        'email' => ['status' => 'granted', 'at' => '2025-03-01T08:00:00Z', 'source' => 'Signup form'],
        'phone' => ['status' => 'denied'],
    ];
@endphp
<x-nq::contact-identities :identities="$identities" :consent="$consent"
    x-on:nq-contact-add="$event.detail.waitUntil(Promise.resolve())"
    x-on:nq-contact-remove="$event.detail.waitUntil(Promise.resolve())"
    x-on:nq-contact-primary="$event.detail.waitUntil(Promise.resolve())"
    x-on:nq-contact-consent="$event.detail.waitUntil(Promise.resolve())" />

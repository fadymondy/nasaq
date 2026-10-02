@php
    $certs = [
        ['id' => 'c1', 'host' => 'app.example.com', 'issuer' => "Let's Encrypt", 'validTo' => '2026-11-30T09:00:00Z', 'autoRenew' => true],
        ['id' => 'c2', 'host' => 'api.example.com', 'issuer' => 'DigiCert', 'validTo' => '2026-10-04T09:00:00Z'],
        ['id' => 'c3', 'host' => '*.example.org', 'issuer' => "Let's Encrypt", 'validTo' => '2026-10-20T09:00:00Z', 'autoRenew' => true],
        ['id' => 'c4', 'host' => 'legacy.example.com', 'issuer' => 'Sectigo', 'validTo' => '2026-09-27T09:00:00Z'],
    ];
@endphp
<div class="grid gap-6">
    <x-nq::cert-monitor :certificates="$certs"
        x-on:add="$event.detail.wait(Promise.resolve({ issuer: 'R3', validTo: '2026-12-28T09:00:00Z', autoRenew: true }))"
        x-on:recheck="$event.detail.wait(Promise.resolve())"
        x-on:renew="$event.detail.wait(Promise.resolve({ validTo: '2026-12-28T09:00:00Z' }))"
        x-on:remove="$event.detail.wait(Promise.resolve())" />
    <div class="flex flex-wrap gap-2">
        <x-nq::cert-monitor.days-left-badge :days="45" host="app.example.com" />
        <x-nq::cert-monitor.days-left-badge :days="12" host="api.example.com" />
        <x-nq::cert-monitor.days-left-badge :days="3" host="shop.example.com" />
        <x-nq::cert-monitor.days-left-badge :days="-2" host="legacy.example.com" />
        <x-nq::cert-monitor.days-left-badge :days="null" host="down.example.com" />
    </div>
</div>

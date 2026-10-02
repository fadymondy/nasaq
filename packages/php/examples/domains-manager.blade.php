@php
    $domains = [
        ['id' => 'd1', 'host' => 'shop.example.com', 'check' => 'verified', 'primary' => true, 'addedAt' => '2026-09-10T09:00:00Z'],
        ['id' => 'd2', 'host' => 'www.example.com', 'check' => 'pending', 'addedAt' => '2026-09-28T09:00:00Z'],
        ['id' => 'd3', 'host' => 'old.example.org', 'check' => 'failed', 'error' => 'CNAME points at 198.51.100.7', 'addedAt' => '2026-09-25T09:00:00Z'],
    ];
@endphp
<div class="grid gap-6">
    <x-nq::domains-manager :domains="$domains" cname-target="edge.example.com"
        x-on:add="$event.detail.wait(Promise.resolve())"
        x-on:remove="$event.detail.wait(Promise.resolve())"
        x-on:recheck="$event.detail.wait(Promise.resolve({ check: 'verified' }))"
        x-on:make-primary="$event.detail.wait(Promise.resolve())" />
    <x-nq::domains-manager.chips :domains="$domains" :max="2" />
</div>

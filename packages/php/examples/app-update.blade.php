@php
    $release = [
        'version' => '2.4.0', 'build' => 240, 'size' => 48200000, 'channel' => 'beta', 'date' => '2026-09-28',
        'notes' => [
            ['type' => 'new', 'text' => 'Offline mode for the courier app'],
            ['type' => 'improved', 'text' => 'Faster order search'],
            ['type' => 'fixed', 'text' => 'Receipts showed the wrong total'],
        ],
    ];
    $releases = [
        ['id' => 'r3', 'version' => '2.5.0-beta', 'build' => 250, 'channel' => 'beta', 'status' => 'draft'],
        ['id' => 'r2', 'version' => '2.4.0', 'build' => 240, 'channel' => 'stable', 'status' => 'live', 'rollout' => 50, 'date' => '2026-09-28'],
        ['id' => 'r1', 'version' => '2.3.0', 'build' => 230, 'channel' => 'stable', 'status' => 'rolled-back', 'rollout' => 0, 'date' => '2026-08-02'],
    ];
@endphp
<div class="flex flex-col gap-8" x-data="{ showUpdate: false }">
    <div class="flex items-center gap-3">
        <x-nq::app-update status="available" version="2.4.0" x-on:click="showUpdate = true" />
        <x-nq::app-update status="downloading" :progress="42" />
        <x-nq::app-update status="ready" />
        <x-nq::app-update status="error" />
    </div>
    <x-nq::app-update.sheet x-model="showUpdate" :release="$release" status="available" />
    <x-nq::app-update.forced-gate :current-build="100" :min-supported-build="200" :release="$release" status="available" class="min-h-0 rounded-card border border-border">
        The app
    </x-nq::app-update.forced-gate>
    <x-nq::app-update.release-manager :releases="$releases" :min-supported-build="230" :usage="[['build' => 220, 'users' => 1200], ['build' => 240, 'users' => 8000]]" />
</div>

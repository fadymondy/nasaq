@php
    $devices = [
        ['id' => 'd1', 'name' => 'Pixel 9', 'kind' => 'phone', 'current' => true, 'lastSeen' => '2026-09-30T08:00:00Z'],
        ['id' => 'd2', 'name' => 'Work laptop', 'kind' => 'computer', 'lastSeen' => '2026-09-28T10:30:00Z'],
        ['id' => 'd3', 'name' => 'iPad', 'kind' => 'tablet'],
    ];
@endphp
<div class="flex flex-col gap-8" x-data="{ showInstall: false, showIos: false, showDone: false }">
    <div class="flex flex-wrap items-center gap-3">
        <x-nq::button variant="primary" x-on:click="showInstall = true">Install the app</x-nq::button>
        <x-nq::button variant="secondary" x-on:click="showIos = true">iPhone steps</x-nq::button>
        <x-nq::button variant="secondary" x-on:click="showDone = true">Installed</x-nq::button>
    </div>
    <x-nq::install-prompt x-model="showInstall" app-name="Nasaq Courier" />
    <x-nq::install-prompt x-model="showIos" app-name="Nasaq Courier" platform="ios" />
    <x-nq::install-prompt x-model="showDone" app-name="Nasaq Courier" platform="installed" />
    <x-nq::install-prompt.push-opt-in permission="granted" :subscribed="true" :devices="$devices" testable />
    <x-nq::install-prompt.push-opt-in permission="default" :requires-install="true" />
</div>

@php($now = \Carbon\Carbon::now())
<div class="flex flex-col gap-6">
    <x-nq::detail-layout
        active-tab="overview"
        :tabs="[
            ['key' => 'overview', 'label' => 'Overview', 'icon' => 'layout-dashboard', 'section' => 'General'],
            ['key' => 'logs', 'label' => 'Logs', 'icon' => 'scroll-text', 'section' => 'General', 'badge' => 12],
            ['key' => 'settings', 'label' => 'Settings', 'icon' => 'settings', 'section' => 'Settings'],
            ['key' => 'billing', 'label' => 'Billing', 'section' => 'Settings', 'disabled' => true],
        ]"
        :identity="['name' => 'Postgres', 'version' => '2.4.1', 'kind' => 'Source', 'status' => ['label' => 'Enabled', 'tone' => 'success'], 'icon' => 'database', 'hue' => 'blue', 'description' => 'Streams rows from a Postgres database.', 'slug' => 'postgres']"
        :activity="['count' => 128430, 'countLabel' => 'records', 'series' => [4, 6, 5, 9, 12, 10, 14, 18], 'lastActiveAt' => $now->copy()->subMinutes(12)]">
        <x-slot:actions><x-nq::button>Disable</x-nq::button></x-slot:actions>
        <x-nq::detail-layout.panel key="overview" active>Overview content</x-nq::detail-layout.panel>
        <x-nq::detail-layout.panel key="logs">Logs content</x-nq::detail-layout.panel>
        <x-nq::detail-layout.panel key="settings">Settings content</x-nq::detail-layout.panel>
    </x-nq::detail-layout>
    <x-nq::detail-layout :tabs="[['key' => 'overview', 'label' => 'Overview']]" loading />
    <x-nq::detail-layout :tabs="[['key' => 'overview', 'label' => 'Overview']]" error retry-click="location.reload()" />
</div>

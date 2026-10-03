@php
    $sara = ['id' => 'u1', 'name' => 'Sara Nasser', 'handle' => 'sara', 'role' => 'Design lead', 'presence' => 'online', 'statusText' => 'In a meeting until 3', 'timeZone' => 'Asia/Riyadh', 'teams' => ['Design', 'Brand']];
    $omar = ['id' => 'u2', 'name' => 'Omar Haddad', 'role' => 'Engineer', 'presence' => 'away', 'timeZone' => 'America/New_York', 'email' => 'omar@example.com'];
    $now = '2026-01-15 12:00:00 UTC';
@endphp
<div class="flex flex-col gap-6">
    <x-nq::profile-card.hover-card :person="$sara" :now="$now" viewer-time-zone="UTC" message view-profile>Sara Nasser</x-nq::profile-card.hover-card>

    <div class="w-80 rounded-floating border border-border bg-popover p-4">
        <x-nq::profile-card :person="$omar" :now="$now" viewer-time-zone="UTC" message mention view-profile />
    </div>

    <x-nq::profile-card.mention-text
        text="Thanks @Sara Nasser, and cc @Design"
        :mentions="[['id' => 'u1', 'name' => 'Sara Nasser', 'start' => 7, 'end' => 19], ['id' => 'design', 'name' => 'Design', 'start' => 28, 'end' => 35]]"
        :resolve="['u1' => $sara, 'design' => ['kind' => 'team']]"
        :now="$now"
        viewer-time-zone="UTC"
    />
</div>

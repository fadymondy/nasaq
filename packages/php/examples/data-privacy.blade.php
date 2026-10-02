@php
    $request = [
        'id' => 'exp_1', 'status' => 'ready', 'requestedAt' => '2026-09-28T09:00:00', 'completedAt' => '2026-09-28T09:12:00',
        'expiresAt' => '2026-10-05T09:00:00', 'sizeBytes' => 48300000,
    ];
@endphp
<div class="flex flex-col gap-10">
    <x-nq::data-privacy :request="$request" can-request can-download poll :includes="['Profile', 'Activity', 'Files']" :grace-days="30" confirm-text="sara@sahab.studio" now="2026-09-29T09:00:00" />
    <x-nq::data-privacy :scheduled-for="'2026-10-14T09:00:00'" confirm-text="sara@sahab.studio" now="2026-09-29T09:00:00" />
    <x-nq::data-privacy.cancel-page bare state="ready" :account="['name' => 'Sara Haddad', 'email' => 'sara@sahab.studio']" scheduled-for="2026-10-14T09:00:00" sign-in-href="/sign-in" />
</div>

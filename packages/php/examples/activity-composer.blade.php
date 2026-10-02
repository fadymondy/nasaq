@php
    $activities = [
        ['id' => 'a1', 'kind' => 'call', 'body' => 'Walked through the proposal and pricing.', 'at' => '2026-09-28T10:00:00', 'durationMinutes' => 20, 'actor' => ['name' => 'Sara Ali']],
        ['id' => 'a2', 'kind' => 'task', 'body' => 'Send the revised quote', 'at' => '2026-10-02T09:00:00'],
        ['id' => 'a3', 'kind' => 'task', 'body' => 'Confirm the kickoff date', 'at' => '2026-09-28T09:00:00', 'actor' => ['name' => 'Omar Nasser']],
        ['id' => 'a4', 'kind' => 'event', 'body' => 'Stage moved to Proposal', 'at' => '2026-09-27T08:00:00', 'actor' => ['name' => 'Omar Nasser']],
        ['id' => 'a5', 'kind' => 'task', 'body' => 'Share the case study', 'at' => '2026-09-25T09:00:00', 'done' => true, 'doneAt' => '2026-09-26T12:00:00'],
    ];
@endphp
<div class="flex w-full max-w-xl flex-col gap-6">
    <x-nq::activity-composer />
    <x-nq::activity-composer.timeline :activities="$activities" toggle delete />
</div>

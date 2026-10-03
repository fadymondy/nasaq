@php
    $weekly = array_map(
        fn ($d) => ['enabled' => in_array($d, [0, 1, 2, 3, 4], true), 'ranges' => [['start' => '09:00', 'end' => '17:00']], 'breaks' => [['start' => '13:00', 'end' => '14:00']]],
        range(0, 6),
    );
    $availability = ['weekly' => $weekly, 'vacations' => [['id' => 'v1', 'from' => '2026-10-04', 'to' => '2026-10-06', 'reason' => 'Conference']]];
@endphp
<x-nq::availability-editor :value="$availability" x-on:nq-availability-save="$event.detail.promise = new Promise(r => setTimeout(r, 400))" />

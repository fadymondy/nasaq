@php
    $events = [
        ['id' => '1', 'title' => 'Design review', 'start' => '2026-09-29T10:00', 'end' => '2026-09-29T11:30', 'tone' => 'brand'],
        ['id' => '2', 'title' => 'Client call', 'start' => '2026-09-29T10:30', 'end' => '2026-09-29T11:00', 'tone' => 'success'],
    ];
@endphp
<x-nq::scheduler :events="$events" :working-hours="['start' => 8, 'end' => 18]" date="2026-09-29" today="2026-09-29" />

@php
    $day = now()->addDay()->format('Y-m-d');
@endphp
<x-nq::booking-slots :slots="[
    ['start' => $day.'T09:00', 'state' => 'available'],
    ['start' => $day.'T10:00', 'state' => 'full'],
    ['start' => $day.'T11:00', 'state' => 'available'],
    ['start' => $day.'T12:00', 'state' => 'held'],
    ['start' => $day.'T14:00', 'state' => 'available'],
]" />

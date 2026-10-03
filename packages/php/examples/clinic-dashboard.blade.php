@php
    $t = now()->getTimestamp() * 1000;
    $rooms = [
        ['id' => 'r1', 'name' => 'Room 1', 'status' => 'busy', 'doctorId' => 'd1', 'ticket' => 'A-014', 'since' => $t - 12 * 60000],
        ['id' => 'r2', 'name' => 'Room 2', 'status' => 'busy', 'doctorId' => 'd2', 'ticket' => 'A-015', 'since' => $t - 4 * 60000],
        ['id' => 'r3', 'name' => 'Room 3', 'status' => 'free'],
        ['id' => 'r4', 'name' => 'Room 4', 'status' => 'cleaning'],
        ['id' => 'r5', 'name' => 'Room 5', 'status' => 'closed'],
    ];
    $doctors = [
        ['id' => 'd1', 'name' => 'Dr. Mona Saleh', 'specialty' => 'Family medicine', 'status' => 'in_visit', 'roomId' => 'r1', 'shift' => ['start' => '08:00', 'end' => '16:00'], 'waiting' => 3],
        ['id' => 'd2', 'name' => 'Dr. Karim Adel', 'specialty' => 'Pediatrics', 'status' => 'in_visit', 'roomId' => 'r2', 'shift' => ['start' => '08:00', 'end' => '16:00'], 'waiting' => 2],
        ['id' => 'd3', 'name' => 'Dr. Huda Nabil', 'specialty' => 'Dermatology', 'status' => 'break', 'shift' => ['start' => '08:00', 'end' => '16:00'], 'waiting' => 0],
    ];
    $queuedAt = [$t - 5 * 60000, $t - 9 * 60000, $t - 14 * 60000, $t - 2 * 60000, $t - 20 * 60000];
@endphp
<x-nq::clinic-dashboard :rooms="$rooms" :doctors="$doctors" :queued-at="$queuedAt" :updated-at="$t - 8000" selectable />

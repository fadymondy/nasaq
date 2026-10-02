@php
    $at = fn (int $h, int $m = 0) => now()->startOfDay()->setTime($h, $m)->format('Y-m-d\TH:i:s');
    $appointments = [
        ['id' => 'a1', 'patient' => 'Layla Hassan', 'service' => 'Check-up', 'start' => $at(8), 'end' => $at(8, 30), 'status' => 'done', 'room' => '2'],
        ['id' => 'a2', 'patient' => 'Omar Nasser', 'service' => 'Blood pressure review', 'start' => $at(8, 30), 'end' => $at(9, 15), 'status' => 'in_visit', 'room' => '2'],
        ['id' => 'a3', 'patient' => 'Sara Khalil', 'service' => 'Follow-up', 'start' => $at(9), 'end' => $at(9, 30), 'status' => 'checked_in', 'room' => '2', 'followUp' => true],
        ['id' => 'a4', 'patient' => 'Hadi Mansour', 'service' => 'Consultation', 'start' => $at(10), 'end' => $at(10, 45), 'status' => 'confirmed'],
        ['id' => 'a5', 'patient' => 'Nour Aziz', 'service' => 'Vaccination', 'start' => $at(11), 'end' => $at(11, 15), 'status' => 'requested'],
        ['id' => 'a6', 'patient' => 'Yara Saad', 'service' => 'Check-up', 'start' => $at(13), 'end' => $at(13, 30), 'status' => 'cancelled'],
    ];
@endphp
<x-nq::clinic-schedule :appointments="$appointments" />

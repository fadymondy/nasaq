@php
    $t = now()->getTimestamp() * 1000;
    $base = ['checkedInAt' => $t - 1800000];
    $queue = [
        $base + ['id' => 'q1', 'ticket' => 'A-014', 'number' => 14, 'name' => 'Layla Hassan', 'status' => 'serving', 'room' => '2', 'queuedAt' => $t - 1500000, 'calledAt' => $t - 600000],
        $base + ['id' => 'q2', 'ticket' => 'A-015', 'number' => 15, 'name' => 'Omar Nasser', 'status' => 'called', 'room' => '2', 'priority' => 'appointment', 'queuedAt' => $t - 1200000, 'calledAt' => $t - 420000],
        $base + ['id' => 'q3', 'ticket' => 'A-016', 'number' => 16, 'name' => 'Sara Khalil', 'status' => 'waiting', 'priority' => 'urgent', 'queuedAt' => $t - 600000],
        $base + ['id' => 'q4', 'ticket' => 'A-017', 'number' => 17, 'name' => 'Hadi Mansour', 'status' => 'waiting', 'priority' => 'appointment', 'queuedAt' => $t - 500000],
        $base + ['id' => 'q5', 'ticket' => 'A-018', 'number' => 18, 'name' => 'Nour Aziz', 'status' => 'waiting', 'queuedAt' => $t - 300000],
    ];
@endphp
<x-nq::clinic-queue :entries="$queue" :now="$t" />

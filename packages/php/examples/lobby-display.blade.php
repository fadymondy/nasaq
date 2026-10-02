@php
    $t = now()->getTimestamp() * 1000;
    $base = ['checkedInAt' => $t - 3600000];
    $queue = [
        $base + ['id' => 'a', 'ticket' => 'A-014', 'number' => 14, 'status' => 'serving', 'room' => '2', 'queuedAt' => $t - 1500000, 'calledAt' => $t - 600000],
        $base + ['id' => 'b', 'ticket' => 'A-015', 'number' => 15, 'status' => 'called', 'room' => '3', 'queuedAt' => $t - 1200000, 'calledAt' => $t - 90000],
        $base + ['id' => 'c', 'ticket' => 'A-016', 'number' => 16, 'status' => 'waiting', 'queuedAt' => $t - 600000],
        $base + ['id' => 'd', 'ticket' => 'A-017', 'number' => 17, 'status' => 'waiting', 'priority' => 'urgent', 'queuedAt' => $t - 500000],
        $base + ['id' => 'e', 'ticket' => 'A-018', 'number' => 18, 'status' => 'waiting', 'queuedAt' => $t - 300000],
    ];
@endphp
<x-nq::lobby-display :entries="$queue" :rooms="['1', '2', '3']" clinic="Nasaq Clinic" :now="$t" />

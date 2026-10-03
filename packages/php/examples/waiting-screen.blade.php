@php
    $t = now()->getTimestamp() * 1000;
    $base = ['priority' => 'normal', 'checkedInAt' => $t - 600000];
    $queue = [
        $base + ['id' => 'q1', 'ticket' => 'A-014', 'number' => 14, 'status' => 'serving', 'room' => '2', 'queuedAt' => $t - 900000, 'calledAt' => $t - 300000],
        $base + ['id' => 'q2', 'ticket' => 'A-015', 'number' => 15, 'status' => 'waiting', 'queuedAt' => $t - 500000],
        $base + ['id' => 'q3', 'ticket' => 'A-016', 'number' => 16, 'status' => 'waiting', 'queuedAt' => $t - 400000],
        $base + ['id' => 'me', 'ticket' => 'A-017', 'number' => 17, 'status' => 'waiting', 'queuedAt' => $t - 300000],
    ];
@endphp
<x-nq::waiting-screen :entries="$queue" entry-id="me" :rooms="2" connection="live" :updated-at="$t - 12000" leaveable />

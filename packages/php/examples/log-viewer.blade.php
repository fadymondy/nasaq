@php
    $now = strtotime('2026-09-29T09:00:00Z') * 1000;
    $entries = [
        ['id' => 1, 'time' => $now, 'level' => 'info', 'source' => 'api', 'message' => 'listening on :3000'],
        ['id' => 2, 'time' => $now + 1200, 'level' => 'error', 'source' => 'db', 'message' => 'connection refused', 'fields' => ['host' => 'db-1']],
    ];
@endphp
<x-nq::log-viewer streaming :entries="$entries" />

@php
    $data = [
        ['date' => '2026-09-27', 'count' => 3],
        ['date' => '2026-09-28', 'count' => 8],
        ['date' => '2026-09-29', 'count' => 1],
    ];
@endphp
<x-nq::heatmap :data="$data" to="2026-09-29" label="Commits by day" />

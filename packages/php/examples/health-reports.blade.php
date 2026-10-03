@php
    $days = [];
    $history = [];
    for ($i = 0; $i < 7; $i++) {
        $date = sprintf('2026-09-%02d', 23 + $i);
        $days[] = ['date' => $date, 'waterMl' => 2000 + $i * 150, 'steps' => 6000 + $i * 400, 'sleepMinutes' => 420 + $i * 5, 'weightKg' => round(84.2 - $i * 0.1, 1), 'meals' => ['total' => 3, 'safe' => 3 - ($i % 2), 'unsafe' => $i % 2]];
        $history[] = ['date' => $date, 'verdict' => $i === 2 ? 'off_protocol' : 'on_protocol', 'entries' => 6];
    }
@endphp
{{-- nq_hr_csv($days) builds the CSV the host serves when the Export button dispatches "nq-export". --}}
<x-nq::health-reports :days="$days" :engines="[['engine' => 'hydration', 'days' => $history]]" :period="30" export />

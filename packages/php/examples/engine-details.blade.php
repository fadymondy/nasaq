@php
    $history = [];
    for ($i = 0; $i < 7; $i++) {
        $history[] = ['date' => sprintf('2026-09-%02d', 23 + $i), 'verdict' => $i === 3 ? 'off_protocol' : ($i === 0 ? 'unevaluated' : 'on_protocol'), 'entries' => 4 + $i];
    }
@endphp
<x-nq::engine-details
    :snapshot="['engine' => 'hydration', 'state' => 'idle', 'totalMl' => 1500, 'dailyCapMl' => 5000, 'unitMl' => 250, 'unitsLogged' => 6, 'unitsTotal' => 20]"
    :history="$history"
    :windows="[7, 30, 365]"
    :records="[['id' => '1', 'at' => '2026-09-29T07:10:00Z', 'title' => '250 mL logged', 'tone' => 'success']]"
    back-href="/health" />

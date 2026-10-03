<x-nq::time-series-panel
    title="Traffic"
    :metrics="[
        ['id' => 'users', 'label' => 'Users'],
        ['id' => 'sessions', 'label' => 'Sessions'],
    ]"
    :data="[
        ['date' => '2026-09-27', 'users' => 2100, 'sessions' => 2700],
        ['date' => '2026-09-28', 'users' => 2240, 'sessions' => 2890],
    ]"
    :previous-data="[
        ['date' => '2026-08-30', 'users' => 1900, 'sessions' => 2450],
        ['date' => '2026-08-31', 'users' => 2010, 'sessions' => 2600],
    ]"
/>

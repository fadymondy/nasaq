<x-nq::engine-card.grid>
    <x-nq::engine-card
        :snapshot="['engine' => 'hydration', 'state' => 'cooldown', 'totalMl' => 750, 'dailyCapMl' => 5000, 'unitMl' => 250, 'unitsLogged' => 3, 'unitsTotal' => 20, 'nextAllowedAt' => '2026-09-29T10:00:30Z']"
        now="2026-09-29T10:00:00Z"
        actions
        detail-href="/engines/hydration"
    />
    <x-nq::engine-card :snapshot="['engine' => 'caffeine', 'state' => 'awaiting_wake', 'blockMinutes' => 90, 'violationsToday' => 0, 'cupsToday' => 0]" actions />
    <x-nq::engine-card
        :snapshot="['engine' => 'medication', 'graceMinutes' => 60, 'doses' => [
            ['id' => 'a', 'name' => 'Morning', 'scheduledFor' => '2026-09-29T08:00:00Z', 'status' => 'logged'],
            ['id' => 'b', 'name' => 'Noon', 'scheduledFor' => '2026-09-29T09:30:00Z', 'status' => 'grace_open'],
        ]]"
        actions
    />
    <x-nq::engine-card :snapshot="['engine' => 'triggers', 'triggerBearing' => 1, 'safe' => 3, 'unclassified' => 0, 'families' => [['id' => 'gout', 'count' => 1]]]" />
</x-nq::engine-card.grid>

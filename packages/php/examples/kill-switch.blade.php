<div class="flex flex-col gap-4">
    <x-nq::kill-switch.paused-banner :paused="['by' => 'Sara Ali', 'at' => '2026-03-01T09:30:00Z', 'reason' => 'Bad deploy']" can-resume :sticky="false" />
    <x-nq::kill-switch :paused="null" :active-count="14" :browsers="[
        ['id' => '1', 'name' => 'Chrome on Windows', 'device' => 'Work laptop', 'online' => true, 'current' => true],
        ['id' => '2', 'name' => 'Edge on Windows', 'online' => false, 'lastSeen' => '2026-03-01T06:30:00Z'],
    ]" />
    <x-nq::kill-switch :paused="['by' => 'Sara Ali', 'at' => '2026-03-01T09:30:00Z', 'reason' => 'Bad deploy']" />
</div>

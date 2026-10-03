<div class="flex flex-col gap-8">
    <x-nq::alerts.list default-status="all" :alerts="[
        ['id' => 'a1', 'title' => 'API latency above 2s', 'severity' => 'critical', 'status' => 'open', 'source' => 'api-gateway', 'createdAt' => '2026-03-02T11:40:00Z', 'count' => 4, 'tags' => ['prod'],
            'description' => 'p95 latency crossed the threshold.',
            'timeline' => [
                ['id' => 'e1', 'type' => 'created', 'at' => '2026-03-02T11:40:00Z'],
                ['id' => 'e2', 'type' => 'notified', 'at' => '2026-03-02T11:41:00Z', 'actor' => 'PagerBot'],
            ]],
        ['id' => 'a2', 'title' => 'Disk 85% full', 'severity' => 'high', 'status' => 'acknowledged', 'source' => 'db-01', 'createdAt' => '2026-03-02T09:00:00Z'],
        ['id' => 'a3', 'title' => 'Certificate renewed', 'severity' => 'low', 'status' => 'resolved', 'source' => 'edge', 'createdAt' => '2026-03-01T10:00:00Z'],
    ]" />
    <x-nq::alerts.security :alerts="[
        ['id' => 's1', 'title' => 'Many failed sign-ins', 'severity' => 'high', 'status' => 'open', 'source' => 'auth', 'createdAt' => '2026-03-02T11:00:00Z', 'category' => 'auth',
            'ip' => '203.0.113.9', 'location' => 'Cairo, EG', 'account' => 'sara@example.com', 'recommendation' => 'Block the address and reset the password.'],
    ]" />
</div>

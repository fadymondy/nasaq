<x-nq::backup-manager
    now="2026-03-02T12:00:00Z"
    can-download
    can-delete
    :schedule="['enabled' => true, 'frequency' => 'daily', 'time' => '02:30']"
    :retention="['keepLast' => 14, 'maxAgeDays' => 60]"
    :backups="[
        ['id' => 'b1', 'createdAt' => '2026-03-02T02:30:00Z', 'sizeBytes' => 1288490188, 'kind' => 'scheduled', 'status' => 'completed'],
        ['id' => 'b2', 'createdAt' => '2026-03-01T02:30:00Z', 'sizeBytes' => 1271310320, 'kind' => 'scheduled', 'status' => 'completed'],
        ['id' => 'b3', 'name' => 'Before the v2 migration', 'createdAt' => '2026-02-20T09:15:00Z', 'sizeBytes' => 1181116006, 'kind' => 'manual', 'status' => 'completed', 'locked' => true],
        ['id' => 'b4', 'createdAt' => '2026-02-28T02:30:00Z', 'kind' => 'scheduled', 'status' => 'failed', 'error' => 'Not enough disk space.'],
    ]" />

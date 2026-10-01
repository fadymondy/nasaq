<div x-data
    x-on:nq-power="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-take-snapshot="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-rollback="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-delete-snapshot="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-save-limits="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))">
    <x-nq::server-card
        :server="[
            'id' => 'srv-1',
            'name' => 'web-01',
            'status' => 'running',
            'address' => '203.0.113.24',
            'region' => 'Frankfurt',
            'os' => 'Ubuntu 24.04',
            'limits' => ['cpuCores' => 4, 'memoryMb' => 8192, 'diskGb' => 160],
            'metrics' => ['cpu' => 42, 'memory' => 71, 'disk' => 38, 'cpuHistory' => [30, 36, 33, 41, 38, 45, 42]],
            'lastDeploy' => ['ref' => 'a1b2c3d', 'at' => '2026-01-01T09:00:00Z', 'status' => 'success', 'by' => 'Layla'],
            'snapshots' => [['id' => 's1', 'name' => 'Before upgrade', 'createdAt' => '2025-12-30T09:00:00Z', 'sizeLabel' => '18.4 GB']],
        ]" />
</div>

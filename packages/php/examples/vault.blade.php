@php
    $secrets = [
        ['id' => 's1', 'name' => 'STRIPE_SECRET_KEY', 'group' => 'Payments', 'kind' => 'api-key', 'hint' => '…4242', 'updatedAt' => '2026-08-30T09:00:00Z', 'expiresAt' => '2027-04-15T00:00:00Z', 'lastAccessedAt' => '2026-09-29T07:00:00Z'],
        ['id' => 's2', 'name' => 'DATABASE_URL', 'group' => 'Backend', 'kind' => 'password', 'description' => 'Primary Postgres', 'hint' => '…x9f2', 'updatedAt' => '2026-07-01T09:00:00Z', 'expiresAt' => '2026-10-05T00:00:00Z'],
        ['id' => 's3', 'name' => 'DEPLOY_SSH_KEY', 'group' => 'Backend', 'kind' => 'ssh-key', 'updatedAt' => '2026-09-19T09:00:00Z', 'expiresAt' => '2026-09-01T00:00:00Z'],
    ];
    $log = [
        ['id' => 'l1', 'secretName' => 'STRIPE_SECRET_KEY', 'actor' => 'Layla', 'action' => 'reveal', 'at' => '2026-09-29T07:00:00Z', 'address' => '10.0.0.1'],
        ['id' => 'l2', 'secretName' => 'DATABASE_URL', 'actor' => 'Omar', 'action' => 'copy', 'at' => '2026-09-28T07:00:00Z'],
    ];
@endphp
<x-nq::vault :secrets="$secrets" :access-log="$log" />

@php
    $keys = [
        ['id' => 'k1', 'name' => 'Production server', 'prefix' => 'nsq_live_a1b2', 'last4' => 'wxyz', 'scopes' => ['read', 'write'], 'createdAt' => '2025-01-10T09:00:00Z', 'lastUsedAt' => '2025-03-01T08:00:00Z', 'expiresAt' => '2099-01-01T00:00:00Z'],
        ['id' => 'k2', 'name' => 'CI pipeline', 'prefix' => 'nsq_live_c3d4', 'last4' => 'q9rs', 'scopes' => ['read'], 'createdAt' => '2025-01-20T09:00:00Z', 'lastUsedAt' => null, 'expiresAt' => null, 'revokedAt' => '2025-02-01T00:00:00Z'],
    ];
    $scopes = [
        ['id' => 'read', 'label' => 'Read', 'description' => 'List and fetch records'],
        ['id' => 'write', 'label' => 'Write', 'description' => 'Create and change records'],
    ];
@endphp
<x-nq::api-keys :keys="$keys" :scopes="$scopes" />

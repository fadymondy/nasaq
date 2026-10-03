<x-nq::audit-log
    :entries="[
        [
            'id' => 'a1',
            'at' => '2026-03-10T09:12:00Z',
            'actor' => ['id' => 'u1', 'name' => 'Sara Alharbi', 'email' => 'sara@example.com'],
            'action' => 'member.role_changed',
            'entity' => ['type' => 'member', 'label' => 'Omar Khalid'],
            'channel' => 'web',
            'ip' => '10.0.0.1',
            'changes' => [
                ['field' => 'plan', 'after' => 'pro'],
                ['field' => 'role', 'before' => 'member', 'after' => 'admin'],
                ['field' => 'seats', 'before' => 1],
            ],
        ],
        ['id' => 'a2', 'at' => '2026-03-11T09:12:00Z', 'actor' => null, 'action' => 'invoice.created', 'entity' => ['type' => 'invoice'], 'channel' => 'api'],
    ]"
    :action-labels="['member.role_changed' => 'Role changed']"
    :entity-labels="['member' => 'Member', 'invoice' => 'Invoice']"
    :retention="['days' => 30]"
    refresh
    x-on:nq-audit-retention="$event.detail.wait(Promise.resolve())" />

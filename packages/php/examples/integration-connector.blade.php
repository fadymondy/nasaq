<div x-data
    x-on:nq-connect="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-disconnect="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 400)))"
    x-on:nq-select-account="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 200)))">
    <x-nq::integration-connector
        :services="[
            [
                'id' => 'search-console',
                'name' => 'Search Console',
                'group' => 'Google',
                'status' => 'disconnected',
                'description' => 'Search performance data.',
                'scopes' => [
                    ['id' => 'read', 'label' => 'Read your Search Console performance data', 'required' => true],
                    ['id' => 'sitemaps', 'label' => 'Submit sitemaps'],
                ],
            ],
            [
                'id' => 'analytics',
                'name' => 'Analytics',
                'group' => 'Google',
                'status' => 'connected',
                'connectedAs' => 'fady@example.com',
                'lastSyncAt' => '2026-01-01T09:00:00Z',
                'scopes' => [['id' => 'read', 'label' => 'Read reports', 'required' => true]],
                'accounts' => [
                    ['id' => 'p1', 'name' => 'Nasaq blog', 'detail' => 'properties/1001'],
                    ['id' => 'p2', 'name' => 'Nasaq docs', 'detail' => 'properties/1002'],
                ],
                'accountId' => 'p1',
            ],
            [
                'id' => 'github',
                'name' => 'GitHub',
                'group' => 'Developer tools',
                'status' => 'error',
                'message' => 'The token was revoked.',
                'connectedAs' => 'fadymondy',
                'scopes' => [['id' => 'repo', 'label' => 'Read repositories', 'required' => true]],
            ],
        ]" />
</div>

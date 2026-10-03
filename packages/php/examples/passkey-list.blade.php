<div x-data
    x-on:nq-passkey-add="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 600)))"
    x-on:nq-passkey-rename="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 600)))"
    x-on:nq-passkey-remove="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 600)))">
    <x-nq::passkey-list
        :supported="true"
        :passkeys="[
            ['id' => '1', 'name' => 'MacBook Pro', 'kind' => 'device', 'authenticator' => 'Touch ID', 'created_at' => '2026-03-02T09:00:00Z', 'last_used_at' => '2026-09-28T08:30:00Z'],
            ['id' => '2', 'name' => 'iCloud Keychain', 'kind' => 'synced', 'authenticator' => 'iCloud Keychain', 'created_at' => '2026-05-14T12:00:00Z', 'last_used_at' => null],
            ['id' => '3', 'name' => 'YubiKey 5C', 'kind' => 'security-key', 'created_at' => '2026-07-21T15:30:00Z', 'last_used_at' => '2026-08-02T10:00:00Z'],
        ]" />
</div>

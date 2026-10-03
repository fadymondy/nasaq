<div x-data
    x-on:nq-connect="$event.detail.wait(new Promise((resolve) => setTimeout(() => resolve({ account: $event.detail.id + '@example.com' }), 600)))"
    x-on:nq-disconnect="$event.detail.wait(new Promise((resolve) => setTimeout(resolve, 600)))">
    <x-nq::connected-accounts
        :providers="[
            ['id' => 'google', 'connected' => true, 'account' => 'fady@example.com'],
            ['id' => 'github', 'connected' => true, 'account' => 'fadymondy'],
            ['id' => 'apple', 'connected' => false],
            ['id' => 'microsoft', 'connected' => false],
        ]"
        :other-sign-in-methods="1" />
</div>

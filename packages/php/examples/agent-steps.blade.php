<x-nq::agent-steps retry :redact-keys="['token', 'password']" :steps="[
    ['id' => 's1', 'label' => 'Read the tag list', 'tool' => 'tags.list', 'status' => 'done', 'durationMs' => 420, 'args' => ['limit' => 50, 'token' => 'tok-123'], 'result' => json_encode(['count' => 42])],
    ['id' => 's2', 'label' => 'Rename 2 tags and delete 1 duplicate', 'tool' => 'tags.update', 'status' => 'awaiting'],
    ['id' => 's3', 'label' => 'Send the summary email', 'tool' => 'mail.send', 'status' => 'pending'],
]">
    <x-slot:confirm>
        <x-nq::agent-steps.confirm summary="I will rename 2 tags and delete 1 duplicate." :changes="[
            ['id' => 'c1', 'title' => 'Rename tag', 'target' => 'tags/launch', 'before' => 'name: launch'.chr(10).'color: blue', 'after' => 'name: product-launch'.chr(10).'color: blue'],
            ['id' => 'c2', 'title' => 'Delete duplicate', 'target' => 'tags/launch-2', 'before' => 'name: launch-2', 'risk' => 'high'],
        ]" />
    </x-slot:confirm>
</x-nq::agent-steps>

@php
    $statuses = [
        ['id' => 'todo', 'name' => 'To do', 'hue' => 'gray', 'stage' => 'todo'],
        ['id' => 'doing', 'name' => 'In progress', 'hue' => 'blue', 'stage' => 'active'],
        ['id' => 'done', 'name' => 'Shipped', 'hue' => 'green', 'stage' => 'done'],
    ];
    $labels = [['id' => 'l1', 'name' => 'Design', 'hue' => 'violet'], ['id' => 'l2', 'name' => 'Backend', 'hue' => 'teal']];
    $people = [['id' => 'u1', 'name' => 'Layla Hassan'], ['id' => 'u2', 'name' => 'Omar Said']];
    $project = [
        'id' => 'p1', 'name' => 'Checkout', 'key' => 'NSQ', 'client' => 'Acme', 'status' => 'active', 'progress' => 40,
        'startDate' => '2026-09-01', 'dueDate' => '2026-11-30', 'budget' => 12000, 'currency' => 'USD',
        'members' => [['name' => 'Layla Hassan'], ['name' => 'Omar Said']],
    ];
    $issues = [
        ['id' => 'i1', 'key' => 'NSQ-1', 'title' => 'Refunds fail for split payments', 'statusId' => 'doing', 'priority' => 'high', 'type' => 'bug', 'assigneeId' => 'u1', 'labelIds' => ['l2'], 'estimateHours' => 4, 'startDate' => '2026-09-24', 'dueDate' => '2026-10-02', 'projectId' => 'p1', 'createdAt' => '2026-09-20T09:00:00Z'],
        ['id' => 'i2', 'key' => 'NSQ-2', 'title' => 'New receipt layout', 'statusId' => 'todo', 'priority' => 'medium', 'type' => 'task', 'assigneeId' => 'u2', 'labelIds' => ['l1'], 'dueDate' => '2026-10-10', 'projectId' => 'p1', 'createdAt' => '2026-09-21T09:00:00Z'],
        ['id' => 'i3', 'key' => 'NSQ-3', 'title' => 'Saved cards', 'statusId' => 'done', 'priority' => 'low', 'type' => 'feature', 'labelIds' => [], 'projectId' => 'p1', 'createdAt' => '2026-09-10T09:00:00Z', 'completedAt' => '2026-09-25T09:00:00Z'],
        ['id' => 'i4', 'key' => 'NSQ-4', 'title' => 'Late fee wording', 'statusId' => 'doing', 'priority' => 'urgent', 'type' => 'chore', 'assigneeId' => 'u1', 'labelIds' => [], 'dueDate' => '2026-09-26', 'projectId' => 'p1', 'createdAt' => '2026-09-15T09:00:00Z'],
    ];
    $activity = [
        ['id' => 'a1', 'title' => 'Moved NSQ-1 to In progress', 'description' => 'From To do', 'at' => '2026-09-29T08:30:00', 'actor' => ['name' => 'Omar Said'], 'kind' => 'status'],
        ['id' => 'a2', 'title' => 'Commented on NSQ-1', 'at' => '2026-09-29T07:10:00', 'actor' => ['name' => 'Layla Hassan'], 'kind' => 'comment'],
        ['id' => 'a3', 'title' => 'Uploaded receipt-v2.pdf', 'at' => '2026-09-28T16:00:00', 'actor' => ['name' => 'Layla Hassan'], 'kind' => 'file'],
        ['id' => 'a4', 'title' => 'Created NSQ-4', 'at' => '2026-09-15T09:00:00', 'kind' => 'issue'],
    ];
    $files = [
        ['id' => 'f1', 'name' => 'receipt-v2.pdf', 'size' => 482304, 'uploadedBy' => 'Layla Hassan', 'uploadedAt' => '2026-09-28T16:00:00'],
        ['id' => 'f2', 'name' => 'refund-flow.png', 'size' => 1812480, 'uploadedBy' => 'Omar Said', 'uploadedAt' => '2026-09-22T10:30:00'],
    ];
    $memory = [
        ['id' => 'm1', 'kind' => 'decision', 'text' => 'Refunds are issued per card, never as one lump.', 'tags' => ['payments', 'refunds'], 'source' => 'Call with finance', 'at' => '2026-09-27T10:00:00'],
        ['id' => 'm2', 'kind' => 'fact', 'text' => 'The client closes books on the 25th.', 'tags' => ['payments'], 'source' => '', 'at' => '2026-09-12T10:00:00'],
        ['id' => 'm3', 'kind' => 'fact', 'text' => 'Receipts must show the VAT number.', 'tags' => ['receipts'], 'source' => 'Contract', 'at' => '2026-09-05T10:00:00'],
    ];
    $integrations = [
        ['id' => 'github', 'name' => 'GitHub', 'description' => 'Link pull requests to issues.', 'icon' => 'github', 'connected' => true],
        ['id' => 'slack', 'name' => 'Slack', 'description' => 'Post updates to a channel.', 'icon' => 'message-square', 'connected' => false],
    ];
    $roles = [['id' => 'owner', 'label' => 'Owner'], ['id' => 'member', 'label' => 'Member']];
    $teamMembers = [
        ['id' => 'm1', 'name' => 'Layla Hassan', 'email' => 'layla@acme.test', 'role' => 'owner', 'joinedAt' => '2025-01-12', 'lastActive' => '2026-09-29'],
        ['id' => 'm2', 'name' => 'Omar Said', 'email' => 'omar@acme.test', 'role' => 'member', 'joinedAt' => '2026-03-20', 'lastActive' => null],
    ];
    $secrets = [['id' => 's1', 'name' => 'STRIPE_SECRET_KEY', 'group' => 'Payments', 'kind' => 'api-key', 'hint' => '…4242', 'updatedAt' => '2026-08-30T09:00:00Z']];
    $notes = [
        ['id' => 'n1', 'kind' => 'note', 'body' => 'Kickoff done, scope agreed.', 'at' => '2026-09-01T09:00:00', 'actor' => ['name' => 'Layla Hassan']],
    ];
    $entries = [['id' => 'e1', 'date' => '2026-09-28', 'seconds' => 5400, 'projectId' => 'p1', 'taskId' => 'i1', 'note' => 'Reproduction']];
@endphp
<div class="w-full max-w-6xl">
    <x-nq::project-view :project="$project" :issues="$issues" :statuses="$statuses" :labels="$labels" :people="$people" update create delete-issue open-issue now="2026-09-29 09:00"
        :activity="$activity" :budget="['total' => 12000, 'spent' => 4800, 'currency' => 'USD']"
        :notes="['items' => $notes, 'toggle' => true, 'delete' => true]"
        :time="['entries' => $entries]"
        :ai="['days' => [['date' => '2026-09-28', 'billed' => 1.2, 'unbilled' => 0.4], ['date' => '2026-09-29', 'billed' => 0, 'unbilled' => 2.1]], 'currency' => 'USD']"
        :files="$files" upload download delete-file
        :memory="['items' => $memory, 'editable' => true, 'deletable' => true]"
        :vault="['secrets' => $secrets]"
        :github="['repo' => ['owner' => 'acme', 'name' => 'storefront'], 'commits' => [['id' => '4f2a91c0e7b3d58a1c6f9e20b4d7a3c815e6f902', 'message' => 'fix(refunds): split the total per card', 'author' => ['login' => 'layla-h'], 'date' => '2026-09-28T16:05:00Z', 'branch' => 'main']]]"
        save :workflow="true" :members="['members' => $teamMembers, 'roles' => $roles, 'currentUserId' => 'm1', 'canInvite' => true]" :integrations="$integrations" archive delete />
</div>

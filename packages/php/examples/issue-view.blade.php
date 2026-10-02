@php
    $statuses = [
        ['id' => 'todo', 'name' => 'To do', 'hue' => 'gray', 'stage' => 'todo'],
        ['id' => 'doing', 'name' => 'In progress', 'hue' => 'blue', 'stage' => 'active'],
        ['id' => 'done', 'name' => 'Shipped', 'hue' => 'green', 'stage' => 'done'],
    ];
    $labels = [['id' => 'l1', 'name' => 'Design', 'hue' => 'violet'], ['id' => 'l2', 'name' => 'Backend', 'hue' => 'teal']];
    $people = [['id' => 'u1', 'name' => 'Layla Hassan'], ['id' => 'u2', 'name' => 'Omar Said']];
    $projects = [['id' => 'p1', 'name' => 'Checkout']];
    $issue = [
        'id' => 'i1', 'key' => 'NSQ-42', 'title' => 'Refunds fail for split payments',
        'description' => '<p>A refund on a split payment returns a 500.</p><p>Steps: pay with two cards, then refund the order.</p>',
        'statusId' => 'doing', 'priority' => 'high', 'type' => 'bug', 'assigneeId' => 'u1', 'labelIds' => ['l2'],
        'estimateHours' => 4, 'dueDate' => '2026-10-02', 'projectId' => 'p1', 'parentId' => 'i0',
        'createdAt' => '2026-09-20T09:00:00Z', 'updatedAt' => '2026-09-28T14:30:00Z',
    ];
    $parentOptions = [
        ['id' => 'i0', 'key' => 'NSQ-40', 'title' => 'Payments hardening', 'statusId' => 'doing'],
        ['id' => 'i7', 'key' => 'NSQ-47', 'title' => 'Receipts redesign', 'statusId' => 'todo'],
    ];
    $subIssues = [
        ['id' => 's1', 'key' => 'NSQ-43', 'title' => 'Reproduce with a test', 'statusId' => 'done', 'assigneeId' => 'u2'],
        ['id' => 's2', 'key' => 'NSQ-44', 'title' => 'Fix the refund total', 'statusId' => 'doing', 'assigneeId' => 'u1'],
    ];
    $me = ['id' => 'u1', 'name' => 'Layla Hassan'];
    $comments = [
        ['id' => 'c1', 'author' => $me, 'body' => 'Reproduced on staging, the second card is refunded twice.', 'createdAt' => '2026-09-28T09:01:00Z'],
        ['id' => 'c2', 'author' => ['id' => 'u2', 'name' => 'Omar Said'], 'body' => 'On it.', 'createdAt' => '2026-09-28T09:05:00Z', 'parentId' => 'c1'],
    ];
    $activity = [
        ['id' => 'a1', 'kind' => 'event', 'body' => 'Status moved to In progress', 'at' => '2026-09-28T08:00:00', 'actor' => ['name' => 'Omar Said']],
        ['id' => 'a2', 'kind' => 'task', 'body' => 'Ask finance for the sample order', 'at' => '2026-10-01T09:00:00'],
    ];
    $entries = [
        ['id' => 'e1', 'date' => '2026-09-28', 'seconds' => 5400, 'projectId' => 'p1', 'taskId' => 'i1', 'note' => 'Reproduction'],
        ['id' => 'e2', 'date' => '2026-09-29', 'seconds' => 3600, 'projectId' => 'p1', 'taskId' => 'i1'],
    ];
@endphp
<div class="w-full max-w-5xl">
    <x-nq::issue-view :issue="$issue" :statuses="$statuses" :labels="$labels" :people="$people" :projects="$projects" :parent-options="$parentOptions" :sub-issues="$subIssues"
        update add-sub-issue open-issue back now="2026-09-29 09:00"
        :development="['repo' => ['owner' => 'acme', 'name' => 'storefront'], 'commits' => [['id' => '4f2a91c0e7b3d58a1c6f9e20b4d7a3c815e6f902', 'message' => 'fix(refunds): split the total per card', 'author' => ['login' => 'layla-h'], 'date' => '2026-09-28T16:05:00Z', 'branch' => 'main']]]"
        :checklist="['items' => [['id' => 'k1', 'text' => 'Write a failing test', 'done' => true], ['id' => 'k2', 'text' => 'Fix the total', 'done' => false]], 'add' => true, 'remove' => true]"
        :thread="['comments' => $comments, 'currentUser' => $me, 'post' => true, 'edit' => true, 'delete' => true]"
        :activity="['items' => $activity, 'toggle' => true, 'delete' => true]"
        :time="['entries' => $entries]"
        :ai="['days' => [['date' => '2026-09-28', 'billed' => 1.2, 'unbilled' => 0.4], ['date' => '2026-09-29', 'billed' => 0, 'unbilled' => 2.1]], 'byModel' => [['id' => 'sonnet', 'label' => 'Sonnet 5.5', 'tokensIn' => 420000, 'tokensOut' => 38000, 'cost' => 3.7]], 'run' => ['tokensIn' => 182000, 'tokensOut' => 24000, 'cached' => 120000, 'cost' => 1.42, 'budget' => 5]]" />
</div>

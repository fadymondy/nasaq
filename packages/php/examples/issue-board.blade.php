@php
    $statuses = [
        ['id' => 'todo', 'name' => 'To do', 'hue' => 'gray', 'stage' => 'todo'],
        ['id' => 'doing', 'name' => 'In progress', 'hue' => 'blue', 'stage' => 'active'],
        ['id' => 'done', 'name' => 'Shipped', 'hue' => 'green', 'stage' => 'done'],
    ];
    $labels = [['id' => 'l1', 'name' => 'Design', 'hue' => 'violet'], ['id' => 'l2', 'name' => 'Payments', 'hue' => 'blue']];
    $people = [['id' => 'u1', 'name' => 'Layla Hassan'], ['id' => 'u2', 'name' => 'Omar Said']];
    $issues = [
        ['id' => 'i1', 'key' => 'NSQ-1', 'title' => 'Refunds fail for split payments', 'statusId' => 'doing', 'priority' => 'high', 'type' => 'bug', 'assigneeId' => 'u1', 'reporterId' => 'u2', 'labelIds' => ['l2'], 'dueDate' => '2026-09-28', 'votes' => 12, 'comments' => 4, 'attachments' => 1],
        ['id' => 'i2', 'key' => 'NSQ-2', 'title' => 'New receipt layout', 'statusId' => 'todo', 'priority' => 'medium', 'type' => 'task', 'assigneeId' => 'u2', 'reporterId' => 'u1', 'labelIds' => ['l1'], 'dueDate' => '2026-10-10', 'votes' => 3],
        ['id' => 'i3', 'key' => 'NSQ-3', 'title' => 'Saved cards', 'statusId' => 'done', 'priority' => 'low', 'type' => 'feature', 'reporterId' => 'u1', 'labelIds' => [], 'votes' => 7, 'voted' => true],
    ];
@endphp
<x-nq::issue-board :issues="$issues" :statuses="$statuses" :labels="$labels" :people="$people" votable creatable now="2026-09-29 09:00:00" />

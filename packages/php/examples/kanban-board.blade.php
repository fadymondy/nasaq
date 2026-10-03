<x-nq::kanban-board
    :columns="[['id' => 'todo', 'title' => 'To do'], ['id' => 'done', 'title' => 'Done']]"
    :cards="[
        ['id' => 'a', 'columnId' => 'todo', 'title' => 'Write the brief', 'labels' => [['label' => 'Docs', 'hue' => 'blue']], 'assignee' => ['name' => 'Sara Ali']],
        ['id' => 'b', 'columnId' => 'todo', 'title' => 'Review copy'],
    ]" />

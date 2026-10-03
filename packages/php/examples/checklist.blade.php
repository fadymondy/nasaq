<x-nq::checklist add remove :items="[
    ['id' => '1', 'text' => 'Write the brief', 'done' => true],
    ['id' => '2', 'text' => 'Prepare the launch', 'done' => false, 'subtasks' => [
        ['id' => '2a', 'text' => 'Draft the announcement', 'done' => true],
        ['id' => '2b', 'text' => 'Schedule the post', 'done' => false],
    ]],
]" />

@php
    $messages = [
        ['id' => 'u1', 'role' => 'user', 'text' => 'What is overdue?', 'at' => '2026-09-29 08:58:00'],
        [
            'id' => 'a1', 'role' => 'assistant', 'at' => '2026-09-29 08:58:05',
            'steps' => [['id' => 's1', 'label' => 'Searched the board', 'tool' => 'tasks.search', 'status' => 'done', 'detail' => 'status = overdue']],
            'text' => "Two tasks are overdue:\n\n- **Send the invoice** (3 days)\n- **Review the contract** (1 day)\n\n```sql\nSELECT title FROM tasks WHERE due < now();\n```\n",
            'sources' => [['id' => 'src1', 'title' => 'Task board', 'url' => 'https://example.com/board']],
            'followUps' => ['Show the details', 'Remind the owners'],
        ],
    ];
@endphp
<div class="h-[40rem] w-full max-w-xl">
    <x-nq::copilot-chat :messages="$messages" :starters="['Summarise this week', 'What is overdue?']" :context="[['id' => 'c1', 'label' => 'Q3 plan', 'kind' => 'file']]"
        :context-options="[['id' => 'c2', 'label' => 'Roadmap', 'kind' => 'page']]" :commands="[['id' => 'deploy', 'label' => 'Deploy', 'description' => 'Ship a build', 'kind' => 'tool']]"
        :models="[['id' => 'fast', 'label' => 'Fast'], ['id' => 'deep', 'label' => 'Deep']]" :toggles="[['id' => 'web', 'label' => 'Web search']]"
        :sessions="[['id' => 'h1', 'title' => 'Weekly summary', 'at' => '2026-09-28 10:00:00']]" closable new-chat attachable stoppable regenerate feedback
        disclaimer="AI can make mistakes. Check important details." />
</div>

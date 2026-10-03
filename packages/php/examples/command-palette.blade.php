<div class="flex flex-col gap-4">
    <x-nq::command-palette.search-trigger class="max-w-xs" />
    <x-nq::command-palette hotkey :commands="[
        ['id' => 'new', 'label' => 'New issue', 'section' => 'create', 'icon' => 'plus', 'shortcut' => 'C', 'keywords' => ['add']],
        ['id' => 'inbox', 'label' => 'Go to inbox', 'section' => 'navigation', 'icon' => 'inbox', 'href' => '/inbox', 'hint' => 'Page'],
        ['id' => 'status', 'label' => 'Change status', 'section' => 'context', 'children' => [
            ['id' => 'status.todo', 'label' => 'Todo'],
            ['id' => 'status.done', 'label' => 'Done'],
        ]],
        ['id' => 'danger', 'label' => 'Delete workspace', 'section' => 'system', 'disabled' => true],
    ]" />
</div>

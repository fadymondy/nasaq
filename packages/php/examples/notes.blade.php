@php
    $notebooks = [
        ['id' => 'work', 'name' => 'Work', 'parentId' => null],
        ['id' => 'plans', 'name' => 'Plans', 'parentId' => 'work'],
        ['id' => 'home', 'name' => 'Home', 'parentId' => null],
    ];
    $notes = [
        ['id' => 'n1', 'title' => 'Q3 roadmap', 'body' => '<p>Ship the <strong>notes</strong> workspace. See [[Meeting notes]].</p>', 'format' => 'rich', 'createdAt' => '2026-09-20T08:00:00Z', 'updatedAt' => '2026-09-30T09:00:00Z', 'pinned' => true, 'color' => 'amber', 'tags' => ['planning'], 'notebookId' => 'plans'],
        ['id' => 'n2', 'title' => 'Meeting notes', 'body' => "# Standup\n\nLinks back to [[Q3 roadmap]].", 'format' => 'markdown', 'createdAt' => '2026-09-25T08:00:00Z', 'updatedAt' => '2026-09-29T15:30:00Z', 'tags' => ['planning', 'team'], 'notebookId' => 'work'],
        ['id' => 'n3', 'title' => 'Passwords', 'body' => '<p>The vault code is 4821.</p>', 'format' => 'rich', 'createdAt' => '2026-08-01T08:00:00Z', 'updatedAt' => '2026-09-01T10:00:00Z', 'sealed' => true],
        ['id' => 'n4', 'title' => 'Shopping', 'body' => '<p>Milk, rice, olive oil.</p>', 'format' => 'rich', 'createdAt' => '2026-07-01T08:00:00Z', 'updatedAt' => '2026-07-02T10:00:00Z', 'notebookId' => 'home', 'archived' => true],
    ];
@endphp
<div class="h-[34rem] w-full overflow-hidden rounded-card border border-border">
    <x-nq::notes :notes="$notes" :notebooks="$notebooks" active-id="n1" now="2026-09-30T12:00:00Z" create update delete duplicate seal unseal unlock lock notebooks-edit share-url="/notes/{id}" />
</div>

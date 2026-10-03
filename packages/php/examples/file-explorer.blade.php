@php
    $nodes = [
        [
            'id' => 'docs', 'name' => 'Documents', 'kind' => 'folder',
            'children' => [
                ['id' => 'brief', 'name' => 'brief.pdf', 'kind' => 'file', 'size' => 482000, 'modifiedAt' => '2026-09-20T10:00:00Z', 'mime' => 'application/pdf'],
                ['id' => 'notes', 'name' => 'notes.md', 'kind' => 'file', 'size' => 1240, 'modifiedAt' => '2026-09-22T08:30:00Z', 'previewText' => "# Launch notes\n\n- Ship the file explorer\n- Write the docs\n"],
            ],
        ],
        ['id' => 'images', 'name' => 'Images', 'kind' => 'folder', 'children' => [
            ['id' => 'logo', 'name' => 'logo.svg', 'kind' => 'file', 'size' => 3400, 'modifiedAt' => '2026-09-10T12:00:00Z', 'mime' => 'image/svg+xml'],
        ]],
        ['id' => 'empty', 'name' => 'Archive', 'kind' => 'folder', 'children' => []],
        ['id' => 'report', 'name' => 'report.xlsx', 'kind' => 'file', 'size' => 91300, 'modifiedAt' => '2026-09-27T14:15:00Z'],
    ];
@endphp
<x-nq::file-explorer :nodes="$nodes" can-upload can-create-folder can-delete can-download
    x-on:nq-file-upload="$event.detail.wait(Promise.resolve())"
    x-on:nq-file-create-folder="$event.detail.wait(Promise.resolve())"
    x-on:nq-file-delete="$event.detail.wait(Promise.resolve())"
    x-on:nq-file-download="window.open('/files/' + $event.detail.id)" />

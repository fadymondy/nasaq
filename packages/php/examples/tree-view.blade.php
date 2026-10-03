@php
    $items = [
        [
            'id' => 'docs',
            'label' => 'Documents',
            'textValue' => 'Documents',
            'icon' => 'folder',
            'children' => [
                ['id' => 'cv', 'label' => 'CV.pdf', 'textValue' => 'CV.pdf', 'icon' => 'file-text'],
            ],
        ],
        ['id' => 'notes', 'label' => 'Notes.txt', 'textValue' => 'Notes.txt', 'icon' => 'file-text'],
    ];
@endphp
<x-nq::tree-view aria-label="Files" :items="$items" :default-expanded="['docs']" />

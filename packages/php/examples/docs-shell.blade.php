@php
    $nav = [
        ['id' => 'intro', 'title' => 'Introduction'],
        ['id' => 'guides', 'title' => 'Guides', 'children' => [['id' => 'install', 'title' => 'Installation', 'badge' => 'New']]],
    ];
    $page = ['id' => 'intro', 'title' => 'Introduction', 'markdown' => "## Why\n\nText.\n\n> [!TIP]\n> Start small."];
@endphp
<x-nq::docs-shell :nav="$nav" :page="$page" nav-href="/docs/{id}">
    <x-slot:brand>Nasaq Docs</x-slot:brand>
</x-nq::docs-shell>

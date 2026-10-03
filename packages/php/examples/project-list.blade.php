<x-nq::project-list :projects="[
    ['id' => '1', 'name' => 'Website redesign', 'key' => 'WEB', 'client' => 'Acme', 'status' => 'active', 'progress' => 62, 'dueDate' => '2026-12-01', 'members' => [['name' => 'Sara Ali'], ['name' => 'Omar Nasser']]],
]" />
{{-- <x-nq::project-list :projects="$projects" /> Bubbling events: nq-entity-list-row-click { row } (row.id is the project id). See the component header for the projects shape and labels. --}}

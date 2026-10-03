<x-nq::contact-list :contacts="[
    [
        'id' => '1',
        'name' => 'Sara Ali',
        'email' => 'sara@example.com',
        'company' => 'Nasaq',
        'stage' => 'customer',
        'tags' => [['label' => 'VIP', 'hue' => 'violet']],
        'owner' => ['name' => 'Omar Nasser'],
        'lastActivity' => '2026-09-28T09:00:00Z',
    ],
]" />
{{-- <x-nq::contact-list :contacts="$contacts" /> Bubbling events: nq-entity-list-row-click { row } (row.id is the contact id). See the component header for the contacts shape and labels. --}}

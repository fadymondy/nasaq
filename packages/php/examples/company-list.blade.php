<x-nq::company-list :companies="[
    ['id' => '1', 'name' => 'Acme', 'domain' => 'acme.com', 'industry' => 'Manufacturing', 'location' => 'Riyadh', 'contactsCount' => 12, 'owner' => ['name' => 'Omar Nasser'], 'lastActivity' => '2026-09-28T09:00:00Z'],
]" />
{{-- <x-nq::company-list :companies="$companies" /> Bubbling events: nq-entity-list-row-click { row } (row.id is the company id). See the component header for the companies shape and labels. --}}

<x-nq::entity-list label="Contacts" view="cards" search="Search contacts…"
    :columns="[
        ['id' => 'name', 'header' => 'Name', 'sortable' => true, 'searchable' => true],
        ['id' => 'company', 'header' => 'Company', 'sortable' => true, 'searchable' => true],
        ['id' => 'plan', 'header' => 'Plan', 'sortable' => true],
        ['id' => 'state', 'type' => 'status', 'header' => 'State', 'sortable' => true, 'options' => [['value' => 'active', 'label' => 'Active', 'tone' => 'success'], ['value' => 'paused', 'label' => 'Paused', 'tone' => 'warning']]],
        ['id' => 'seen', 'type' => 'html', 'key' => 'seenCell', 'sortKey' => 'seenTs', 'header' => 'Last seen', 'sortable' => true],
        ['id' => 'note', 'header' => 'Note', 'hideable' => true, 'hidden' => true],
    ]"
    :rows="[
        ['id' => 'a', 'name' => 'Mona Ali', 'company' => 'Acme', 'plan' => 'Pro', 'tags' => ['vip'], 'state' => 'active', 'seenCell' => '<b>Today</b>', 'seenTs' => 3, 'note' => 'Renewal in May'],
        ['id' => 'b', 'name' => 'Omar Hassan', 'company' => 'Globex', 'plan' => 'Team', 'tags' => ['new', 'vip'], 'state' => 'paused', 'seenCell' => '<b>Last week</b>', 'seenTs' => 1, 'note' => ''],
        ['id' => 'c', 'name' => 'Layla Samir', 'company' => 'Initech', 'plan' => 'Free', 'tags' => ['new'], 'state' => 'active', 'seenCell' => '<b>Yesterday</b>', 'seenTs' => 2, 'note' => 'Trial'],
    ]"
    :facets="[['id' => 'tags', 'title' => 'Tags', 'options' => [['value' => 'vip', 'label' => 'VIP'], ['value' => 'new', 'label' => 'New']]]]"
    :row-actions="[
        ['id' => 'open', 'label' => 'Open', 'icon' => 'external-link'],
        ['id' => 'pause', 'label' => 'Pause', 'icon' => 'pause', 'visibleWhen' => ['field' => 'state', 'eq' => 'active']],
        ['id' => 'resume', 'label' => 'Resume', 'icon' => 'play', 'visibleWhen' => ['field' => 'state', 'ne' => 'active']],
        ['id' => 'delete', 'label' => 'Delete', 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'],
    ]">
    <x-slot:cell_company><strong data-testid="company-cell" class="font-medium text-foreground" x-text="row.company"></strong></x-slot:cell_company>
    <x-slot:card>
        <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3 pe-[var(--entity-card-controls)]">
                <x-nq::avatar name="Contact" />
                <div class="flex min-w-0 flex-col">
                    <span class="truncate text-label text-foreground" x-text="row.name"></span>
                    <span class="truncate text-body-sm text-muted-foreground" x-text="row.company"></span>
                </div>
            </div>
            <x-nq::entity-list.card-meta label="Plan"><span x-text="row.plan"></span></x-nq::entity-list.card-meta>
        </div>
    </x-slot:card>
</x-nq::entity-list>

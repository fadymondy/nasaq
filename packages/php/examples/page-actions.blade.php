<div class="flex items-center gap-3">
    <x-nq::page-actions
        class="ms-auto"
        :primary="['label' => 'New issue', 'icon' => 'plus', 'shortcut' => 'C', 'event' => 'issue-new']"
        :actions="[
            ['label' => 'Export CSV', 'icon' => 'download', 'event' => 'issues-export'],
            ['label' => 'Delete', 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger', 'event' => 'issue-delete'],
        ]"
    />
</div>

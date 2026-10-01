<x-nq::data-table label="Issues" row-key="key" name-key="title" selectable :page-size="20" search="Search issues…" view-options
    :columns="[
        ['id' => 'key', 'header' => 'Key', 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'title', 'header' => 'Title', 'sortable' => true, 'searchable' => true],
        ['id' => 'status', 'header' => 'Status', 'type' => 'status', 'filter' => true, 'options' => [
            ['value' => 'Open', 'label' => 'Open', 'tone' => 'neutral'],
            ['value' => 'In progress', 'label' => 'In progress', 'tone' => 'info'],
            ['value' => 'Done', 'label' => 'Done', 'tone' => 'success'],
        ]],
        ['id' => 'due', 'header' => 'Due', 'type' => 'date', 'sortable' => true, 'align' => 'end'],
    ]"
    :rows="[
        ['key' => 'MH-728', 'title' => 'Checkout drops the coupon', 'status' => 'In progress', 'due' => '2026-10-05'],
        ['key' => 'MH-731', 'title' => 'Arabic invoice totals misalign', 'status' => 'Open', 'due' => '2026-10-09'],
        ['key' => 'MH-702', 'title' => 'Export CSV timeouts', 'status' => 'Done', 'due' => '2026-09-28'],
    ]"
    :row-actions="[
        ['id' => 'edit', 'label' => 'Edit', 'icon' => 'pencil'],
        ['id' => 'delete', 'label' => 'Delete', 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'],
    ]" />

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


<x-nq::data-table label="Deployments" class="mt-8" row-key="id" name-key="service" selectable striped multi-sort pinning resizable search="Search deployments…"
    :columns="[
        ['id' => 'service', 'header' => 'Service', 'sortable' => true, 'searchable' => true, 'pin' => 'start', 'size' => 180, 'hideable' => false],
        ['id' => 'region', 'header' => 'Region', 'sortable' => true, 'size' => 140],
        ['id' => 'owner', 'header' => 'Owner', 'sortable' => true, 'size' => 160],
        ['id' => 'requests', 'header' => 'Requests', 'type' => 'number', 'sortable' => true, 'range' => true, 'align' => 'end', 'size' => 140],
        ['id' => 'deployed', 'header' => 'Deployed', 'type' => 'date', 'sortable' => true, 'range' => true, 'size' => 150],
        ['id' => 'status', 'header' => 'Status', 'type' => 'status', 'filter' => true, 'resizable' => false, 'options' => [
            ['value' => 'live', 'label' => 'Live', 'tone' => 'success'],
            ['value' => 'degraded', 'label' => 'Degraded', 'tone' => 'warning'],
        ]],
    ]"
    :rows="[
        ['id' => 'd1', 'service' => 'checkout-api', 'region' => 'eu-west', 'owner' => 'Layla', 'requests' => 18400, 'deployed' => '2026-10-01', 'status' => 'live', 'notes' => 'Rolled out behind the new flag.'],
        ['id' => 'd2', 'service' => 'invoice-worker', 'region' => 'me-central', 'owner' => 'Omar', 'requests' => 9200, 'deployed' => '2026-09-26', 'status' => 'degraded', 'notes' => 'Queue depth is above target.'],
        ['id' => 'd3', 'service' => 'search-index', 'region' => 'eu-west', 'owner' => 'Layla', 'requests' => 4100, 'deployed' => '2026-09-30', 'status' => 'live', 'notes' => ''],
        ['id' => 'd4', 'service' => 'notifier', 'region' => 'us-east', 'owner' => 'Sara', 'requests' => 18400, 'deployed' => '2026-09-18', 'status' => 'live', 'notes' => 'Retries capped at three.'],
    ]"
    :expand-when="['field' => 'notes', 'empty' => false]">
    <x-slot name="expanded"><p class="text-body-sm text-muted-foreground" x-text="row.notes"></p></x-slot>
</x-nq::data-table>

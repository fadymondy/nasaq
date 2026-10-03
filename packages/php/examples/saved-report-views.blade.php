<x-nq::saved-report-views
    :views="[['id' => 'weekly', 'name' => 'Weekly review', 'query' => 'range=7d&status=open'], ['id' => 'mine', 'name' => 'Sara won', 'query' => 'owner=sara&status=won', 'shared' => true]]"
    :fields="[['id' => 'status', 'kind' => 'multi', 'label' => 'Status', 'options' => [['value' => 'open', 'label' => 'Open'], ['value' => 'won', 'label' => 'Won']]], ['id' => 'owner', 'kind' => 'select', 'label' => 'Owner', 'options' => [['value' => 'sara', 'label' => 'Sara']]]]"
    can-rename can-update can-share can-delete />

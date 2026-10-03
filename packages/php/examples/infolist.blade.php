<x-nq::infolist
    :columns="2"
    :items="[
        ['id' => 'name', 'label' => 'Name', 'labelAr' => 'الاسم', 'value' => 'Acme Trading'],
        ['id' => 'status', 'label' => 'Status', 'labelAr' => 'الحالة', 'type' => 'enum', 'value' => 'active', 'options' => ['active' => ['label' => 'Active', 'labelAr' => 'نشط', 'variant' => 'success']]],
        ['id' => 'vip', 'label' => 'VIP', 'labelAr' => 'مميز', 'type' => 'boolean', 'value' => true],
        ['id' => 'email', 'label' => 'Email', 'type' => 'email', 'value' => 'hello@acme.test', 'copyable' => true],
    ]"
/>

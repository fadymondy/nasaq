<x-nq::provider-switcher :capabilities="[
    ['capability' => 'data', 'label' => 'Data', 'active' => 'postgres', 'options' => ['postgres', 'sqlite'], 'isDefault' => true],
    ['capability' => 'queue', 'label' => 'Queue', 'active' => 'redis', 'options' => ['redis', 'nats', 'database'], 'isDefault' => false],
]" />

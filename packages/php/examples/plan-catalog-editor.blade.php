<x-nq::plan-catalog-editor
    currency="USD"
    applicable
    :catalog="[
        'apps' => [
            ['id' => 'crm', 'name' => 'CRM', 'enabled' => true],
            ['id' => 'helpdesk', 'name' => 'Helpdesk', 'enabled' => true],
        ],
        'features' => [
            ['id' => 'sso', 'name' => 'Single sign-on'],
            ['id' => 'pipelines', 'name' => 'Pipelines', 'appId' => 'crm'],
        ],
        'plans' => [
            ['id' => 'free', 'name' => 'Free', 'description' => 'For trying things out', 'priceMonthly' => 0, 'seats' => 3, 'storageGb' => 1, 'features' => ['Community support'], 'visible' => true, 'subscribers' => 14],
            ['id' => 'team', 'name' => 'Team', 'description' => 'For growing teams', 'priceMonthly' => 29, 'seats' => 15, 'storageGb' => 50, 'features' => ['Priority support'], 'visible' => true, 'subscribers' => 6, 'featured' => true],
        ],
        'payg' => [['id' => 'api-calls', 'name' => 'API calls', 'unit' => '1K calls', 'unitPrice' => 0.5, 'freeUnits' => 100]],
        'bundles' => [['id' => 'suite', 'name' => 'Suite', 'price' => 49, 'appIds' => ['crm', 'helpdesk']]],
    ]"
/>

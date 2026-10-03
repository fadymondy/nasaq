<x-nq::workflow-network
    title="Refund requests"
    :steps="[
        ['id' => 'ask', 'title' => 'Customer asks', 'owner' => 'Customer'],
        ['id' => 'check', 'title' => 'Within 14 days?', 'kind' => 'decision'],
        ['id' => 'review', 'title' => 'Manager reviews', 'kind' => 'human', 'owner' => 'Support'],
        ['id' => 'pay', 'title' => 'Refund issued', 'kind' => 'output'],
    ]"
    :links="[
        ['from' => 'ask', 'to' => 'check'],
        ['from' => 'check', 'to' => 'pay', 'label' => 'Yes'],
        ['from' => 'check', 'to' => 'review', 'label' => 'No'],
        ['from' => 'review', 'to' => 'pay', 'label' => 'Approved'],
    ]" />

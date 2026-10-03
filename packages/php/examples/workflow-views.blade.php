@php
    $steps = [
        ['id' => 'ask', 'title' => 'Customer asks for a refund', 'owner' => 'Customer'],
        [
            'id' => 'check',
            'title' => 'Within 14 days?',
            'branches' => [
                ['label' => 'Yes', 'steps' => [['id' => 'approve', 'title' => 'Approve the refund', 'owner' => 'Support']]],
                ['label' => 'No', 'steps' => [['id' => 'review', 'title' => 'Manager reviews', 'kind' => 'human', 'description' => 'Late requests need a second look.']]],
            ],
        ],
        [
            'id' => 'pay',
            'title' => 'Issue the refund',
            'kind' => 'output',
            'children' => [
                ['id' => 'ledger', 'title' => 'Post to the ledger', 'owner' => 'Billing API', 'kind' => 'system'],
                ['id' => 'email', 'title' => 'Email the customer'],
            ],
        ],
    ];
@endphp
<x-nq::workflow-views :steps="$steps" storage-key="workflow:view" highlight="check" clickable />

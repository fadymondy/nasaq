<x-nq::attention :max="2" :items="[
    ['id' => 'deploy', 'tone' => 'danger', 'title' => 'Riyadh Storefront deployment failed', 'time' => '12m', 'href' => '/deploys/91',
        'action' => ['label' => 'Retry', 'href' => '/deploys/91/retry'], 'dismissible' => true],
    ['id' => 'approve', 'tone' => 'warning', 'title' => 'MH-721 is waiting for your approval', 'href' => '/issues/MH-721'],
    ['id' => 'inbox', 'tone' => 'info', 'icon' => 'message-square', 'title' => 'Unread conversations', 'count' => 4, 'href' => '/inbox'],
    ['id' => 'invoice', 'tone' => 'neutral', 'title' => 'Invoice INV-204 is due in 3 days', 'href' => '/invoices/204'],
]" />

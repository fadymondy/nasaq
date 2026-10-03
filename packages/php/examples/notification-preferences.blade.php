@php
    $kinds = [
        ['id' => 'mention', 'label' => 'Mentions', 'description' => 'Someone mentions you.', 'group' => 'Activity'],
        ['id' => 'comment', 'label' => 'Comments', 'description' => 'Replies to your comments.', 'group' => 'Activity'],
        ['id' => 'security', 'label' => 'Security alerts', 'description' => 'Sign-ins and password changes.', 'group' => 'Account', 'locked' => ['email']],
        ['id' => 'billing', 'label' => 'Billing', 'group' => 'Account'],
    ];
    $value = [
        'matrix' => ['mention' => ['email' => true, 'push' => true], 'comment' => ['email' => true], 'billing' => ['email' => true]],
        'quietHours' => ['enabled' => true, 'from' => '22:00', 'to' => '07:00'],
        'dailyCap' => 20,
        'digest' => ['enabled' => true, 'frequency' => 'weekly', 'time' => '08:00', 'day' => 1],
    ];
    $destinations = [
        ['id' => 'd1', 'kind' => 'email', 'target' => 'team@example.com', 'verified' => true],
        ['id' => 'd2', 'kind' => 'webhook', 'target' => 'https://hooks.example.com/nasaq'],
    ];
@endphp
<x-nq::notification-preferences :kinds="$kinds" :value="$value" now="2026-09-29T09:00:00" push-permission="default" request-push
    :unavailable="['whatsapp' => 'Add a WhatsApp number first']" :destinations="$destinations" can-add can-remove can-test />

@php
    $events = [
        ['id' => 'order.created', 'label' => 'Order created', 'group' => 'Orders'],
        ['id' => 'order.paid', 'label' => 'Order paid', 'group' => 'Orders'],
        ['id' => 'order.refunded', 'label' => 'Order refunded', 'group' => 'Orders'],
        ['id' => 'customer.created', 'label' => 'Customer created', 'group' => 'Customers'],
        ['id' => 'customer.deleted', 'label' => 'Customer deleted', 'group' => 'Customers'],
    ];
    $endpoints = [
        ['id' => 'e1', 'name' => 'Order updates', 'url' => 'https://hooks.example.com/orders', 'channel' => 'Custom HTTP', 'events' => ['order.created', 'order.paid', 'order.refunded'], 'enabled' => true, 'secretLast4' => 'a1b2', 'lastDeliveryAt' => '2026-09-29T08:00:00Z', 'lastDeliveryStatus' => 'success'],
        ['id' => 'e2', 'name' => 'Team chat', 'url' => 'https://chat.example.com/hooks/T0001', 'channel' => 'Slack', 'events' => array_column($events, 'id'), 'enabled' => true, 'secretLast4' => 'c3d4', 'lastDeliveryAt' => '2026-09-28T10:00:00Z', 'lastDeliveryStatus' => 'failed'],
        ['id' => 'e3', 'name' => 'Billing sync', 'url' => 'https://billing.example.com/webhook', 'events' => ['order.paid'], 'enabled' => false, 'secretLast4' => 'e5f6'],
    ];
    $deliveries = [
        ['id' => 'd1', 'endpointId' => 'e1', 'event' => 'order.created', 'status' => 'success', 'code' => 200, 'durationMs' => 142, 'at' => '2026-09-29T08:00:00Z', 'attempt' => 1, 'request' => '{"id":"ord_1","total":4200}', 'response' => '{"ok":true}'],
        ['id' => 'd2', 'endpointId' => 'e2', 'event' => 'order.paid', 'status' => 'failed', 'code' => 500, 'durationMs' => 1204, 'at' => '2026-09-28T10:00:00Z', 'attempt' => 3, 'request' => '{"id":"ord_2"}', 'response' => 'Internal Server Error', 'error' => 'The receiver answered with 500.'],
        ['id' => 'd3', 'endpointId' => 'e1', 'event' => 'customer.created', 'status' => 'pending', 'at' => '2026-09-29T09:30:00Z', 'attempt' => 1],
    ];
    $sources = [
        ['id' => 's1', 'name' => 'Payments provider', 'target' => 'https://api.pay.example.com/events', 'intervalSeconds' => 300, 'lastStatus' => 'ok', 'lastAt' => '2026-09-29T09:58:00Z'],
        ['id' => 's2', 'name' => 'Shipping provider', 'target' => 'https://api.ship.example.com/events', 'intervalSeconds' => 900, 'lastStatus' => 'error', 'lastAt' => '2026-09-29T09:50:00Z', 'lastError' => 'HTTP 503'],
    ];
@endphp
<x-nq::webhooks-manager :events="$events" :endpoints="$endpoints" :deliveries="$deliveries" :sources="$sources"
    :push="['url' => 'https://app.example.com/webhooks/in', 'token' => 'tok_live_7f3a9c21']"
    x-on:save-endpoint="$event.detail.wait(Promise.resolve($event.detail.id ? {} : { secret: 'whsec_example_9f8e7d6c5b4a39281706' }))"
    x-on:delete-endpoint="$event.detail.wait(Promise.resolve())"
    x-on:toggle-endpoint="$event.detail.wait(Promise.resolve())"
    x-on:rotate-secret="$event.detail.wait(Promise.resolve({ secret: 'whsec_rotated_0a1b2c3d4e5f60718293' }))"
    x-on:test-endpoint="$event.detail.wait(Promise.resolve({ ok: true, code: 200, durationMs: 120 }))"
    x-on:replay-delivery="$event.detail.wait(Promise.resolve())"
    x-on:set-interval="$event.detail.wait(Promise.resolve())"
    x-on:poll-source="$event.detail.wait(Promise.resolve())" />

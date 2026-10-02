@php
    $sources = [
        ['id' => 'home', 'kind' => 'page', 'label' => 'Home page', 'detail' => '/'],
        ['id' => 'signup', 'kind' => 'event', 'label' => 'Signed up', 'detail' => 'user_signed_up'],
        ['id' => 'order', 'kind' => 'event', 'label' => 'Placed an order', 'detail' => 'order_placed'],
    ];
@endphp
<x-nq::funnel-builder :sources="$sources"
    x-on:save="window.__saved = JSON.stringify($event.detail.value); $event.detail.wait(Promise.resolve())" />

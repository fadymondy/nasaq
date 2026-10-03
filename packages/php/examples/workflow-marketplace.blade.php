@php
    $categories = [
        ['id' => 'comms', 'label' => 'Messaging'],
        ['id' => 'flow', 'label' => 'Flow'],
    ];
    $listings = [
        [
            'id' => 'send-email', 'kind' => 'step', 'name' => 'Send email', 'summary' => 'Send a templated email.', 'category' => 'comms', 'icon' => 'mail', 'installs' => 1800,
            'step' => ['role' => 'action', 'inputs' => ['Contact'], 'outputs' => ['Message id'], 'fields' => [['name' => 'to', 'label' => 'To', 'kind' => 'text', 'required' => true], ['name' => 'subject', 'label' => 'Subject', 'kind' => 'text']]],
        ],
        [
            'id' => 'new-order', 'kind' => 'step', 'name' => 'New order', 'summary' => 'Starts when an order is placed.', 'category' => 'flow', 'icon' => 'zap', 'installs' => 900,
            'step' => ['role' => 'trigger', 'outputs' => ['Order']],
        ],
        [
            'id' => 'welcome', 'kind' => 'preset', 'name' => 'Welcome series', 'summary' => 'Greet every new customer.', 'category' => 'comms', 'installs' => 2400,
            'preset' => ['steps' => [['id' => 'a', 'title' => 'Customer signs up'], ['id' => 'b', 'title' => 'Send email', 'kind' => 'system'], ['id' => 'c', 'title' => 'Done', 'kind' => 'output']]],
        ],
    ];
@endphp
<x-nq::workflow-marketplace :categories="$categories" :listings="$listings" />

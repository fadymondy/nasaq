@php
    $agents = [
        ['id' => 'a1', 'name' => 'Sara Ali', 'email' => 'sara@example.com'],
        ['id' => 'a2', 'name' => 'Omar Nasser', 'email' => 'omar@example.com'],
    ];
    $conversations = [
        [
            'id' => 'c1', 'channel' => 'chat', 'status' => 'open', 'unread' => 2,
            'contact' => ['id' => 'u1', 'name' => 'Layla Hassan', 'email' => 'layla@example.com', 'phone' => '+966 50 123 4567', 'company' => 'Hassan Trading', 'tags' => ['VIP']],
            'messages' => [
                ['id' => 'm1', 'direction' => 'in', 'kind' => 'text', 'body' => 'Hi, where is my order?', 'at' => '2026-09-29T08:00:00'],
                ['id' => 'm2', 'direction' => 'in', 'kind' => 'text', 'body' => 'It was due yesterday.', 'at' => '2026-09-29T08:02:00'],
            ],
        ],
        [
            'id' => 'c2', 'channel' => 'email', 'status' => 'open', 'subject' => 'Invoice for September',
            'contact' => ['id' => 'u2', 'name' => 'Karim Adel', 'email' => 'karim@example.com'],
            'messages' => [
                ['id' => 'm3', 'direction' => 'in', 'kind' => 'text', 'subject' => 'Invoice for September', 'body' => 'Could you resend the invoice?', 'at' => '2026-09-29T07:00:00'],
            ],
        ],
        [
            'id' => 'c3', 'channel' => 'whatsapp', 'status' => 'closed', 'pinned' => true,
            'contact' => ['id' => 'u3', 'name' => 'Nour Samir'],
            'messages' => [
                ['id' => 'm4', 'direction' => 'in', 'kind' => 'text', 'body' => 'Thanks, all sorted.', 'at' => '2026-09-28T16:00:00'],
            ],
        ],
    ];
    $snippets = [
        ['id' => 's1', 'shortcut' => 'refund', 'title' => 'Refund policy', 'body' => 'Hi {{name}}, refunds take 3 to 5 working days. {{agent}}'],
    ];
@endphp
<x-nq::inbox :conversations="$conversations" :agents="$agents" current-agent-id="a1" :snippets="$snippets"
    x-on:nq-inbox-send="$event.detail.wait(Promise.resolve())" />

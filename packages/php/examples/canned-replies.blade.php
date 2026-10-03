@php
    $replies = [
        ['id' => '1', 'shortcut' => 'refund', 'title' => 'Refund policy', 'body' => 'Hi {{name}}, refunds are issued within 5 working days. {{agent}} from {{company}}', 'uses' => 38, 'updatedAt' => '2026-09-25T09:00:00Z'],
        ['id' => '2', 'shortcut' => 'thanks', 'title' => 'Thank you', 'body' => 'Thanks for reaching out, {{name}}. Anything else I can help with?', 'uses' => 112, 'updatedAt' => '2026-09-20T09:00:00Z'],
    ];
@endphp
<x-nq::canned-replies :replies="$replies"
    x-on:save-reply="$event.detail.wait(Promise.resolve($event.detail.isNew ? { id: 'r-' + Date.now() } : {}))"
    x-on:delete-reply="$event.detail.wait(Promise.resolve())" />

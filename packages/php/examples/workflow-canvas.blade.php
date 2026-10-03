@php
    $types = [
        ['id' => 'webhook', 'label' => 'Webhook', 'category' => 'trigger', 'icon' => 'webhook', 'role' => 'trigger', 'fields' => [['name' => 'path', 'label' => 'Path', 'kind' => 'text', 'required' => true]]],
        ['id' => 'http', 'label' => 'HTTP request', 'category' => 'action', 'icon' => 'globe', 'fields' => [['name' => 'url', 'label' => 'URL', 'kind' => 'url', 'required' => true]]],
        ['id' => 'mail', 'label' => 'Send email', 'category' => 'action', 'icon' => 'mail'],
    ];
@endphp
<div class="h-[640px]">
    <x-nq::workflow-canvas
        title="New workflow"
        :value="['nodes' => [], 'edges' => []]"
        :types="$types"
        :categories="[['id' => 'trigger', 'label' => 'Triggers'], ['id' => 'action', 'label' => 'Actions']]"
        saveable
        x-on:nq-workflow-save="$event.detail.waitUntil(fetch('/api/flows', { method: 'PUT', body: JSON.stringify($event.detail.graph) }))" />
</div>

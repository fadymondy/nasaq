@php
    $tasks = [
        ['id' => 'chat', 'label' => 'Chat', 'description' => 'Conversations with the assistant'],
        ['id' => 'vision', 'label' => 'Image understanding', 'modality' => 'vision'],
    ];
    $models = [
        ['id' => 'sonnet', 'label' => 'Sonnet', 'modalities' => ['text', 'vision']],
        ['id' => 'haiku', 'label' => 'Haiku'],
    ];
    $providers = [
        ['id' => 'cloud', 'name' => 'Cloud API', 'kind' => 'cloud', 'endpoint' => 'https://api.example.com', 'modalities' => ['text', 'vision'], 'status' => 'online'],
        ['id' => 'edge', 'name' => 'Edge node', 'kind' => 'node', 'endpoint' => 'https://edge.example.com', 'modalities' => ['text'], 'status' => 'offline'],
    ];
    $value = ['auto' => false, 'routes' => ['chat' => ['model' => 'sonnet', 'fallback' => 'haiku'], 'vision' => ['model' => 'sonnet']], 'backend' => 'cloud'];
@endphp
<x-nq::model-routing-editor :task-classes="$tasks" :models="$models" :providers="$providers" :value="$value"
    x-on:nq-routing-save="$event.detail.waitUntil(Promise.resolve())"
    x-on:nq-routing-register="$event.detail.waitUntil(Promise.resolve())"
    x-on:nq-routing-remove-provider="$event.detail.waitUntil(Promise.resolve())" />

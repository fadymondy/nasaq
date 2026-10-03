<x-nq::step-editor
    class="w-full max-w-2xl"
    :types="[
        ['id' => 'http', 'label' => 'HTTP request', 'category' => 'data', 'fields' => [['name' => 'url', 'label' => 'URL', 'kind' => 'url', 'required' => true], ['name' => 'method', 'label' => 'Method', 'kind' => 'select', 'options' => [['value' => 'GET', 'label' => 'GET'], ['value' => 'POST', 'label' => 'POST']]]], 'defaults' => ['method' => 'GET']],
        ['id' => 'loop', 'label' => 'Loop', 'category' => 'flow', 'fields' => []],
    ]"
    :categories="[['id' => 'data', 'label' => 'Data'], ['id' => 'flow', 'label' => 'Flow']]"
    :steps="[['id' => 's1', 'type' => 'http', 'config' => ['url' => 'https://@{{host}}/orders', 'method' => 'GET']]]"
    :params="[['id' => 'p1', 'name' => 'host', 'value' => 'api.example.com']]"
    :nestable="['loop']"
    :known="['trigger.body']"
    testable
/>

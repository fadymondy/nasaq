@php
    $environments = [['id' => 'dev', 'label' => 'Development'], ['id' => 'prod', 'label' => 'Production']];
    $fields = [['id' => 'plan', 'label' => 'Plan', 'kind' => 'select', 'options' => [['value' => 'pro', 'label' => 'Pro']]]];
    $flag = [
        'key' => 'new-checkout', 'name' => 'New checkout', 'description' => 'The single-page checkout.',
        'environments' => ['dev' => ['enabled' => true, 'rollout' => 100], 'prod' => ['enabled' => true, 'rollout' => 25]],
        'variants' => [['key' => 'control', 'weight' => 50], ['key' => 'single-page', 'weight' => 50]],
        'rules' => [[
            'event' => 'evaluate',
            'conditions' => ['kind' => 'group', 'id' => 'g1', 'join' => 'and', 'children' => [['kind' => 'condition', 'id' => 'c1', 'field' => 'plan', 'op' => 'is', 'value' => 'pro']]],
            'actions' => [['id' => 'a1', 'type' => 'serve', 'config' => ['variant' => 'single-page']]],
        ]],
        'updatedAt' => '2026-09-28T10:00:00Z', 'updatedBy' => 'Mona',
    ];
    $audit = [
        ['id' => '1', 'action' => 'created', 'actor' => 'Mona', 'at' => '2026-09-20T08:00:00Z'],
        ['id' => '2', 'action' => 'toggled', 'actor' => 'Omar', 'at' => '2026-09-25T09:30:00Z', 'environment' => 'Production', 'to' => 'on'],
    ];
@endphp
{{-- One flag: switches and rollout per environment, targeting rules, variants, history and the kill switch. --}}
<x-nq::feature-flag-detail :flag="$flag" :environments="$environments" :fields="$fields" :audit="$audit"
    x-on:toggle="window.__toggled = $event.detail.environment + ':' + $event.detail.enabled; $event.detail.wait(Promise.resolve())"
    x-on:rollout="window.__rollout = $event.detail.environment + ':' + $event.detail.percent; $event.detail.wait(Promise.resolve())"
    x-on:rules="$event.detail.wait(Promise.resolve())"
    x-on:variants="$event.detail.wait(Promise.resolve())"
    x-on:kill="window.__killed = $event.detail.reason; $event.detail.wait(Promise.resolve())"
    x-on:restore="$event.detail.wait(Promise.resolve())" />

{{-- The form comes from a JSON Schema (a PHP array). Save fires nq-schema-form-submit once it is valid; resolve the promise with { fieldErrors } to show the server's errors. --}}
<x-nq::schema-form
    :schema="[
        'type' => 'object',
        'required' => ['name'],
        'properties' => [
            'name' => ['type' => 'string', 'title' => 'Name', 'x-title-ar' => 'الاسم'],
            'status' => ['type' => 'string', 'enum' => ['draft', 'live']],
            'owner' => ['type' => 'string', 'title' => 'Owner', 'x-relation' => ['resource' => 'users']],
        ],
    ]"
    :relations="['users' => ['options' => [['value' => 'u1', 'label' => 'Layla Hassan'], ['value' => 'u2', 'label' => 'Omar Khaled']]]]"
    x-on:nq-schema-form-submit="$event.detail.waitUntil(fetch('/api/projects', { method: 'POST', body: JSON.stringify($event.detail.value) }).then(() => ({})))" />

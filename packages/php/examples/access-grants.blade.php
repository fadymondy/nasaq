@php
    $apps = [
        ['id' => 'a1', 'name' => 'Notion Sync', 'kind' => 'app', 'publisher' => 'Acme Labs', 'orgId' => 'o1', 'scopes' => ['docs:read', 'users:read'], 'authorizedAt' => '2026-08-01', 'lastUsedAt' => '2026-09-28T10:00:00Z'],
        ['id' => 'g1', 'name' => 'Support Agent', 'kind' => 'agent', 'publisher' => 'Nasaq', 'orgId' => 'o1', 'scopes' => ['docs:read', 'docs:write', 'billing:read', 'users:read', 'users:write'], 'authorizedAt' => '2026-09-01', 'lastUsedAt' => null],
    ];
    $scopeLabels = ['docs:read' => 'Read documents', 'docs:write' => 'Write documents', 'billing:read' => 'Read billing', 'users:read' => 'Read users', 'users:write' => 'Write users'];
    $organizations = [['id' => 'o1', 'name' => 'Acme'], ['id' => 'o2', 'name' => 'Globex']];
    $resources = [['id' => 'docs', 'label' => 'Documents'], ['id' => 'billing', 'label' => 'Billing']];
    $grants = ['g1' => ['docs' => 'write', 'billing' => 'read']];
@endphp
<x-nq::access-grants :apps="$apps" :scope-labels="$scopeLabels" :organizations="$organizations" :resources="$resources" :grants="$grants" :sections="['apps', 'grants']" can-revoke can-change-grant />

@php
    $flags = [
        ['key' => 'new-checkout', 'name' => 'New checkout', 'environments' => ['dev' => ['enabled' => true, 'rollout' => 100], 'prod' => ['enabled' => true, 'rollout' => 25]], 'updatedAt' => '2026-09-28T10:00:00Z', 'updatedBy' => 'Mona', 'tags' => ['checkout']],
        ['key' => 'dark-mode', 'name' => 'Dark mode', 'environments' => ['dev' => ['enabled' => true, 'rollout' => 100], 'prod' => ['enabled' => false, 'rollout' => 0]], 'updatedAt' => '2026-09-20T10:00:00Z', 'updatedBy' => 'Omar'],
        ['key' => 'legacy-search', 'name' => 'Legacy search', 'killed' => true, 'environments' => ['dev' => ['enabled' => true, 'rollout' => 100], 'prod' => ['enabled' => true, 'rollout' => 100]], 'updatedAt' => '2026-09-10T08:00:00Z'],
        ['key' => 'beta-reports', 'name' => 'Beta reports', 'environments' => ['dev' => ['enabled' => true, 'rollout' => 100], 'prod' => ['enabled' => true, 'rollout' => 100]], 'updatedAt' => '2026-09-01T08:00:00Z', 'updatedBy' => 'Mona'],
    ];
    $environments = [['id' => 'dev', 'label' => 'Development'], ['id' => 'prod', 'label' => 'Production']];
@endphp
<x-nq::feature-flags :flags="$flags" :environments="$environments"
    x-on:toggle="window.__toggled = $event.detail.key + ':' + $event.detail.environment + ':' + $event.detail.enabled; $event.detail.wait(Promise.resolve())"
    x-on:open="window.__opened = $event.detail.key"
    x-on:create="window.__created = true"
    x-on:delete="$event.detail.wait(Promise.resolve())" />

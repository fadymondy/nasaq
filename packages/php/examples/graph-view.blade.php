<div class="h-[640px]">
    <x-nq::graph-view
        :kinds="[
            ['id' => 'person', 'label' => 'People', 'hue' => 'blue', 'icon' => 'user', 'shape' => 'circle'],
            ['id' => 'doc', 'label' => 'Documents', 'hue' => 'amber', 'icon' => 'file-text', 'shape' => 'rounded'],
        ]"
        :nodes="[
            ['id' => 'sara', 'label' => 'Sara', 'kind' => 'person', 'description' => 'Product lead'],
            ['id' => 'spec', 'label' => 'Onboarding spec', 'kind' => 'doc', 'updatedAt' => '2026-09-20T10:00:00Z'],
        ]"
        :links="[['source' => 'sara', 'target' => 'spec', 'label' => 'wrote', 'kind' => 'authored']]"
        :link-kinds="[['id' => 'authored', 'style' => 'flow', 'arrow' => true]]"
        openable />
</div>

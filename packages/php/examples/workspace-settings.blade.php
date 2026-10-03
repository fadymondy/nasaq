@php
    $workspaces = [
        ['id' => 'w1', 'name' => 'Acme Studio', 'slug' => 'acme-studio', 'role' => 'Owner', 'members' => 12, 'current' => true],
        ['id' => 'w2', 'name' => 'Sahab Labs', 'slug' => 'sahab-labs', 'role' => 'Member', 'members' => 1],
    ];
@endphp
<div class="flex flex-col gap-8">
    <x-nq::workspace-settings.list :workspaces="$workspaces" can-create />
    <x-nq::workspace-settings :workspace="['name' => 'Acme Studio', 'slug' => 'acme-studio']" slug-prefix="nasaq.app/" check-slug has-leave has-delete />
    <x-nq::workspace-settings.create-dialog slug-prefix="nasaq.app/">
        <x-slot:trigger><x-nq::button variant="primary">New workspace</x-nq::button></x-slot:trigger>
    </x-nq::workspace-settings.create-dialog>
</div>

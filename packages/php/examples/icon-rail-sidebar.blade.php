<div class="h-[28rem] w-full overflow-hidden rounded-floating border border-border">
    <x-nq::icon-rail-sidebar section="people" active-item="roles" :sections="[
        ['id' => 'home', 'label' => 'Home', 'icon' => 'house', 'groups' => [['id' => 'main', 'label' => 'Main', 'items' => [
            ['id' => 'dash', 'label' => 'Dashboard', 'icon' => 'layout-dashboard', 'href' => '#dash'],
            ['id' => 'inbox', 'label' => 'Inbox', 'icon' => 'inbox', 'badge' => 3],
        ]]]],
        ['id' => 'people', 'label' => 'People', 'title' => 'People and access', 'icon' => 'users', 'badge' => 2, 'groups' => [['id' => 'access', 'items' => [
            ['id' => 'users', 'label' => 'Users', 'icon' => 'user'],
            ['id' => 'access', 'label' => 'Access', 'icon' => 'shield', 'children' => [
                ['id' => 'roles', 'label' => 'Roles'],
                ['id' => 'perms', 'label' => 'Permissions'],
            ]],
        ]]]],
        ['id' => 'help', 'label' => 'Help', 'icon' => 'circle-help', 'href' => '#help'],
    ]">
        <div id="rail-page" class="p-4 text-body-sm">Page content</div>
    </x-nq::icon-rail-sidebar>
</div>

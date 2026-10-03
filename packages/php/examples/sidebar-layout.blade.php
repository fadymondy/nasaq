<nav class="flex w-64 flex-col gap-1 rounded-floating border border-border bg-sidebar p-2" aria-label="Main">
    <x-nq::sidebar-layout storage-key="my-app-nav" :items="[
        ['id' => 'dashboard', 'label' => 'Dashboard', 'icon' => 'layout-dashboard', 'required' => true],
        ['id' => 'inbox', 'label' => 'Inbox', 'icon' => 'inbox'],
        ['id' => 'issues', 'label' => 'My issues', 'icon' => 'list-todo'],
    ]">
        <x-nq::sidebar-layout.sortable>
        <x-nq::sidebar-layout.sortable-item id="dashboard">
            <a href="/" class="relative flex h-nav-row w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0"><x-lucide-layout-dashboard /><span class="min-w-0 flex-1 truncate">Dashboard</span></a>
        </x-nq::sidebar-layout.sortable-item>
        <x-nq::sidebar-layout.sortable-item id="inbox">
            <a href="/inbox" class="relative flex h-nav-row w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0"><x-lucide-inbox /><span class="min-w-0 flex-1 truncate">Inbox</span></a>
        </x-nq::sidebar-layout.sortable-item>
        <x-nq::sidebar-layout.sortable-item id="issues">
            <a href="/issues" class="relative flex h-nav-row w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0"><x-lucide-list-todo /><span class="min-w-0 flex-1 truncate">My issues</span></a>
        </x-nq::sidebar-layout.sortable-item>
        </x-nq::sidebar-layout.sortable>
        <x-nq::sidebar-layout.trigger variant="ghost" size="sm">Customize sidebar</x-nq::sidebar-layout.trigger>
        <x-nq::sidebar-layout.customize />
    </x-nq::sidebar-layout>
</nav>

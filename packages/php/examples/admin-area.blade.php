<div class="h-[32rem] w-full overflow-hidden rounded-floating border border-border">
    <x-nq::admin-area active-item="users" :user="['name' => 'Sara Alharbi', 'email' => 'sara@example.com']" environment="Production">
        <x-nq::admin-area.page title="Users" :breadcrumbs="[['label' => 'People'], ['label' => 'Users']]">
            <p class="text-body-sm text-muted-foreground">Your screen goes here.</p>
        </x-nq::admin-area.page>
    </x-nq::admin-area>
</div>

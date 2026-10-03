<div class="flex flex-col gap-4">
    <x-nq::mobile-nav-kit.filter-strip :items="[['value' => 'all', 'label' => 'All', 'count' => 12], ['value' => 'open', 'label' => 'Open', 'icon' => 'circle-dot'], ['value' => 'done', 'label' => 'Done']]" value="all" />
    <x-nq::mobile-nav-kit.swipe-action-row :end-actions="[['id' => 'archive', 'label' => 'Archive', 'icon' => 'archive']]">
        <div class="p-4">Design review moved to 3 PM</div>
    </x-nq::mobile-nav-kit.swipe-action-row>
    <x-nq::mobile-nav-kit.bottom-tab-bar position="static" :items="[['value' => 'home', 'label' => 'Home', 'icon' => 'house'], ['value' => 'inbox', 'label' => 'Inbox', 'icon' => 'inbox', 'badge' => 3], ['value' => 'me', 'label' => 'Me', 'icon' => 'user-round']]" value="home" />
</div>

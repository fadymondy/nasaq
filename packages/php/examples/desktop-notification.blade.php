<div class="flex flex-col gap-6">
    <x-nq::desktop-notification platform="windows" app-name="Nasaq" title="Deploy finished" body="Production is on v1.4.2." :actions="[['id' => 'open', 'label' => 'Open']]" />
    <x-nq::desktop-notification.permission-prompt dismissible testable settings />
    <div class="relative h-56 overflow-hidden rounded-card border border-border">
        <x-nq::desktop-notification.stack :items="[['id' => 'a', 'appName' => 'Nasaq', 'title' => 'Build passed'], ['id' => 'b', 'appName' => 'Nasaq', 'title' => 'New comment', 'body' => 'Sara replied to your thread.']]" />
    </div>
</div>

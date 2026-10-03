<div class="h-[32rem]">
    <x-nq::desktop-os-shell
        :apps="[
            ['id' => 'files', 'title' => 'Files', 'icon' => 'folder', 'content' => '<p class=\'p-4\'>Your files</p>', 'single' => true, 'keywords' => ['documents']],
            ['id' => 'notes', 'title' => 'Notes', 'icon' => 'notebook-pen', 'content' => '<p class=\'p-4\'>Notes</p>'],
            ['id' => 'mail', 'title' => 'Mail', 'icon' => 'mail', 'content' => '<p class=\'p-4\'>Inbox</p>', 'pinned' => false],
        ]"
        :menus="[\Nasaq\DesktopPowerMenu::make(['actions' => ['about', 'settings', 'sleep', 'restart', 'shutDown', 'logOut'], 'appName' => 'Nasaq', 'confirm' => true]), ['id' => 'file', 'label' => 'File', 'items' => [['id' => 'new', 'label' => 'New window', 'shortcut' => 'N'], ['id' => 'close', 'label' => 'Close', 'separated' => true, 'danger' => true]]]]"
    />
</div>
<x-nq::confirm-provider />

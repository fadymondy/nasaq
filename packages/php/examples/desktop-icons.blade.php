<div class="flex flex-col gap-4">
    <div class="h-40 w-full" id="grid-example">
        <x-nq::desktop-icons :items="[['id' => 'files', 'title' => 'Files', 'icon' => 'folder'], ['id' => 'notes', 'title' => 'Notes', 'icon' => 'notebook-pen'], ['id' => 'mail', 'title' => 'Mail', 'icon' => 'mail']]" />
    </div>
    <div class="relative h-72 w-full" id="free-example">
        <x-nq::desktop-icons free :items="[['id' => 'docs', 'title' => 'Documents', 'icon' => 'file-text'], ['id' => 'pics', 'title' => 'Pictures', 'icon' => 'image']]" :positions="['docs' => ['x' => 8, 'y' => 8]]" />
    </div>
</div>

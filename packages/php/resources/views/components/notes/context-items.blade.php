{{-- Internal: the items of a note's right-click menu in x-nq::notes. The note is `n` (the x-for variable). in-editor leaves out "Open".
     An item is drawn only when the host handles the action (the `can` flags), like an omitted callback in the React Notes. --}}
@props(['inEditor' => false])

@unless ($inEditor)
    <x-nq::context-menu.item x-on:click="pick(n, 'open')"><x-lucide-file-text aria-hidden="true" /><span x-text="t.open"></span></x-nq::context-menu.item>
@endunless
<template x-if="has(n, 'pin')">
    <x-nq::context-menu.item x-on:click="pick(n, 'pin')">
        <x-lucide-pin-off x-show="n.pinned" aria-hidden="true" /><x-lucide-pin x-show="!n.pinned" aria-hidden="true" />
        <span x-text="n.pinned ? t.unpin : t.pin"></span>
        
    </x-nq::context-menu.item>
</template>
<template x-if="has(n, 'color')"><x-nq::context-menu.item x-on:click="pick(n, 'color')"><x-lucide-palette aria-hidden="true" /><span x-text="t.color"></span></x-nq::context-menu.item></template>
<template x-if="has(n, 'tags')"><x-nq::context-menu.item x-on:click="pick(n, 'tags')"><x-lucide-tag aria-hidden="true" /><span x-text="t.editTags"></span></x-nq::context-menu.item></template>
<template x-if="has(n, 'move')"><x-nq::context-menu.item x-on:click="pick(n, 'move')"><x-lucide-folder-input aria-hidden="true" /><span x-text="t.move"></span></x-nq::context-menu.item></template>
<template x-if="has(n, 'duplicate')">
    <x-nq::context-menu.item x-on:click="pick(n, 'duplicate')" x-bind:data-disabled="off(n, 'duplicate') ? '' : null" x-bind:aria-disabled="off(n, 'duplicate') ? 'true' : null">
        <x-lucide-copy aria-hidden="true" /><span x-text="t.duplicate"></span>
        
    </x-nq::context-menu.item>
</template>
<template x-if="has(n, 'share')">
    <x-nq::context-menu.item x-on:click="pick(n, 'share')" x-bind:data-disabled="off(n, 'share') ? '' : null" x-bind:aria-disabled="off(n, 'share') ? 'true' : null">
        <x-lucide-share-2 aria-hidden="true" /><span x-text="t.share"></span>
    </x-nq::context-menu.item>
</template>
<x-nq::context-menu.item x-on:click="pick(n, 'export')" x-bind:data-disabled="off(n, 'export') ? '' : null" x-bind:aria-disabled="off(n, 'export') ? 'true' : null">
    <x-lucide-download aria-hidden="true" /><span x-text="t.export"></span>
</x-nq::context-menu.item>
<template x-if="has(n, 'lock')">
    <x-nq::context-menu.item x-on:click="pick(n, 'lock')"><x-lucide-lock aria-hidden="true" /><span x-text="t.lockNow"></span>
        
    </x-nq::context-menu.item>
</template>
<template x-if="has(n, 'unseal')"><x-nq::context-menu.item x-on:click="pick(n, 'unseal')"><x-lucide-lock-open aria-hidden="true" /><span x-text="t.removeSeal"></span></x-nq::context-menu.item></template>
<template x-if="has(n, 'seal')">
    <x-nq::context-menu.item x-on:click="pick(n, 'seal')"><x-lucide-lock aria-hidden="true" /><span x-text="t.seal"></span>
        
    </x-nq::context-menu.item>
</template>
<template x-if="has(n, 'archive')">
    <x-nq::context-menu.item x-on:click="pick(n, 'archive')">
        <x-lucide-archive-restore x-show="n.archived" aria-hidden="true" /><x-lucide-archive x-show="!n.archived" aria-hidden="true" />
        <span x-text="n.archived ? t.restore : t.archiveNote"></span>
        
    </x-nq::context-menu.item>
</template>
<template x-if="has(n, 'delete')">
    <x-nq::context-menu.item variant="danger" x-on:click="pick(n, 'delete')"><x-lucide-trash-2 aria-hidden="true" /><span x-text="t.deleteNote"></span></x-nq::context-menu.item>
</template>

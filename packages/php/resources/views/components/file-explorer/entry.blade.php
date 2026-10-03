{{-- Internal part of <x-nq::file-explorer>: one file or folder (a list row or a grid tile) with its context menu.
     id: the node id. folder: a folder (no Download). role: row | listitem. menu: wrap in a context menu. hidden: start hidden (not in the open folder).
     can-download / can-delete: which actions the menu offers. download-label / delete-label: their text. selectable: sets aria-selected (files only). --}}
@props(['id', 'folder' => false, 'role' => 'row', 'menu' => false, 'hidden' => false, 'canDownload' => false, 'canDelete' => false, 'downloadLabel' => 'Download', 'deleteLabel' => 'Delete', 'selectable' => true])
@php
    $j = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $classes = 'group/entry min-w-0 outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus cursor-pointer';
    $sel = $selectable ? "isPicked(".$j($id).") ? 'true' : 'false'" : 'null';
    $showDownload = $canDownload && ! $folder;
@endphp
@if ($menu)
    <x-nq::context-menu>
        <x-nq::context-menu.trigger data-entry role="{{ $role }}" data-node-id="{{ $id }}" tabindex="0"
            x-bind:style="{ order: rowOrder({!! $j($id) !!}) }" x-bind:hidden="inFolder({!! $j($id) !!}) ? null : ''"
            x-bind:data-selected="isPicked({!! $j($id) !!}) ? '' : null"
            x-bind:aria-selected="{!! $sel !!}"
            x-on:click="go({!! $j($id) !!})" x-on:keydown.enter.self.prevent="go({!! $j($id) !!})" x-on:keydown.space.self.prevent="go({!! $j($id) !!})"
            :hidden="$hidden ?: null"
            {{ $attributes->cn($classes) }}>{{ $slot }}</x-nq::context-menu.trigger>
        <x-nq::context-menu.content>
            @if ($showDownload)
                <x-nq::context-menu.item x-on:click="download({!! $j($id) !!})"><x-lucide-download aria-hidden="true" />{{ $downloadLabel }}</x-nq::context-menu.item>
            @endif
            @if ($showDownload && $canDelete)
                <x-nq::context-menu.separator />
            @endif
            @if ($canDelete)
                <x-nq::context-menu.item variant="danger" x-on:click="askDelete({!! $j($id) !!})"><x-lucide-trash-2 aria-hidden="true" />{{ $deleteLabel }}</x-nq::context-menu.item>
            @endif
        </x-nq::context-menu.content>
    </x-nq::context-menu>
@else
    <div data-slot="{{ $attributes->get('data-slot', 'file-explorer-entry') }}" data-entry role="{{ $role }}" data-node-id="{{ $id }}" tabindex="0"
        x-bind:style="{ order: rowOrder({!! $j($id) !!}) }" x-bind:hidden="inFolder({!! $j($id) !!}) ? null : ''"
        x-bind:data-selected="isPicked({!! $j($id) !!}) ? '' : null"
            x-bind:aria-selected="{!! $sel !!}"
        x-on:click="go({!! $j($id) !!})" x-on:keydown.enter.self.prevent="go({!! $j($id) !!})" x-on:keydown.space.self.prevent="go({!! $j($id) !!})"
        @if ($hidden) hidden @endif
        {{ $attributes->except('data-slot')->cn($classes) }}>{{ $slot }}</div>
@endif

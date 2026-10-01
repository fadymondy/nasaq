{{-- <x-nq::editor-chrome.tabs :tabs="[['id' => 'a', 'title' => 'Trip plan', 'dirty' => true], ['id' => 'b', 'title' => 'Ideas']]" active="a" new />
     The strip of open documents above an editor. tabs: id, title, dirty, pinned, path (the tooltip). active: the active id (x-modelable: x-model="doc").
     closable: shows a close button on each tab (default true; Delete and middle-click close too). new: adds the "New document" button.
     Arrow keys (mirrored in RTL) and Home/End move between tabs. Events (bubbling): "nq-editor-tab-select" { id }, "nq-editor-tab-close" { id }, "nq-editor-tab-new".
     Not ported: the per-tab context menu. labels: ['openDocuments', 'newTab']. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['tabs' => [], 'active' => null, 'closable' => true, 'new' => false, 'labels' => []])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $list = collect($tabs);
    $ordered = $list->where('pinned', true)->merge($list->where('pinned', '!=', true))->values()->all();
    $tabsLabel = $labels['openDocuments'] ?? \Nasaq\Nasaq::t('Open documents', 'المستندات المفتوحة');
    $newLabel = $labels['newTab'] ?? \Nasaq\Nasaq::t('New document', 'مستند جديد');
@endphp
<div data-slot="editor-tabs" x-data="nqEditorTabs({!! $js($ordered) !!}, {!! $js($active) !!}, {!! $js(['closable' => (bool) $closable]) !!})" x-modelable="active"
    {{ $attributes->cn('flex items-stretch border-b border-border bg-nq-surface-soft') }}>
    <div role="tablist" aria-label="{{ $tabsLabel }}" class="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:thin]">
        <template x-for="tab in tabs" :key="tab.id">
            <div role="tab" x-bind:data-tab-id="tab.id" x-bind:data-active="tab.id === active ? '' : null" x-bind:data-dirty="tab.dirty ? '' : null"
                x-bind:aria-selected="tab.id === active" x-bind:tabindex="tab.id === active ? 0 : -1" x-bind:title="tab.path || title(tab)"
                x-bind:class="tab.id === active ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground'"
                x-on:click="select(tab.id)" x-on:keydown="onKey($event, tab)" x-on:auxclick="onAux($event, tab)"
                class="group/tab relative flex h-row max-w-56 min-w-24 shrink-0 cursor-default items-center gap-1.5 border-e border-border ps-3 pe-1 text-body-sm outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                <span x-show="tab.id === active" aria-hidden="true" class="absolute inset-x-0 top-0 h-0.5 bg-primary"></span>
                <x-lucide-file-text aria-hidden="true" class="size-3.5 shrink-0 opacity-70" />
                <span dir="auto" x-text="title(tab)" x-bind:class="tab.pinned ? 'font-medium' : ''" class="min-w-0 flex-1 truncate text-start"></span>
                <span x-show="tab.dirty" class="contents">
                    <span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-nq-accent"></span>
                    <span class="sr-only">{{ \Nasaq\Nasaq::t('Unsaved changes', 'تغييرات غير محفوظة') }}</span>
                </span>
                <button type="button" tabindex="-1" x-show="closable && !tab.pinned" x-bind:aria-label="closeLabel(tab)" x-on:click.stop="close(tab.id)"
                    class="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground pointer-coarse:size-7">
                    <x-lucide-x aria-hidden="true" class="size-3" />
                </button>
            </div>
        </template>
    </div>
    @if ($new)
        <x-nq::button variant="ghost" size="icon-sm" :aria-label="$newLabel" class="m-1 shrink-0" x-on:click="add()"><x-lucide-plus /></x-nq::button>
    @endif
</div>

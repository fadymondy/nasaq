{{-- <x-nq::notes :notes="$notes" :notebooks="$notebooks" create update delete duplicate seal unseal unlock lock share-url="/notes/{id}" />
     The notes workspace: notebooks and filters, a list or coloured board, and the editor, with keyboard shortcuts (Ctrl+N or Alt+N new, Mod+Shift+P pin, A archive, D duplicate, L seal, F search, Alt+M actions).
     Wide: three columns. Medium: list and editor. Narrow: the list and the editor swap. The notes live in the page (Alpine), seeded from the server; every change is also sent to the page as an event.
     notes: [['id', 'title', 'body', 'format' => 'rich'|'markdown', 'createdAt', 'updatedAt' (ISO or ms), 'pinned', 'archived', 'sealed', 'color', 'tags' => [], 'notebookId']]. The body of a sealed note is left out until its id is in `unlocked`.
     notebooks: [['id', 'name', 'parentId']]. unlocked: ids of sealed notes already open. active-id, scope (all|pinned|sealed|archive|nb:id|tag:name), sort (updated|created|title), view (list|grid).
     autosave-delay (800), now (ms or ISO, for "Today"), locale, labels (override of the built-in words; sentences carry %s).
     Actions are off until switched on, like omitting the callback: create, update (pin, archive, colour, tags, move and autosave), delete, duplicate, seal, unseal, unlock, lock, notebooks; share-url (with {id}) turns on Share.
     The page listens on the root; each event has detail.wait(promise), resolve { error } to refuse and show the message:
       nq-note-update {id, patch}, nq-note-create (resolve {id}), nq-note-delete {id}, nq-note-duplicate {copy}, nq-note-seal / nq-note-unseal {id, password}, nq-note-unlock {id, password} (resolve {body}), nq-note-lock {id},
       nq-notebook-create {name, parentId}, nq-notebook-rename {id, name}, nq-notebook-delete {id}, nq-note-export {id, format, file} (cancelable).
     Needs the Alpine module (nqNotes). The rich body is a contenteditable with a small toolbar; a Markdown note previews as plain text with its [[wikilinks]] as links. --}}
@include('nasaq::components.notes._logic')
@props(['notes' => [], 'notebooks' => [], 'unlocked' => [], 'labels' => [], 'activeId' => null, 'scope' => 'all', 'sort' => 'updated', 'view' => 'list', 'autosaveDelay' => 800, 'now' => null, 'locale' => null, 'create' => false, 'update' => false, 'delete' => false, 'duplicate' => false, 'seal' => false, 'unseal' => false, 'unlock' => false, 'lock' => false, 'notebooksEdit' => false, 'shareUrl' => null, 'loading' => false, 'error' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_notes_words($locale, $labels);
    $ms = function ($v) {
        if (is_numeric($v)) {
            return (int) $v;
        }
        $time = $v ? strtotime((string) $v) : false;

        return $time === false ? 0 : $time * 1000;
    };
    $open = array_map('strval', (array) $unlocked);
    $list = [];
    foreach ($notes as $n) {
        $sealed = (bool) ($n['sealed'] ?? false);
        $list[] = [
            'id' => (string) $n['id'],
            'title' => (string) ($n['title'] ?? ''),
            'body' => $sealed && ! in_array((string) $n['id'], $open, true) ? '' : (string) ($n['body'] ?? ''),
            'format' => ($n['format'] ?? 'rich') === 'markdown' ? 'markdown' : 'rich',
            'createdAt' => $ms($n['createdAt'] ?? 0),
            'updatedAt' => $ms($n['updatedAt'] ?? 0),
            'pinned' => (bool) ($n['pinned'] ?? false),
            'archived' => (bool) ($n['archived'] ?? false),
            'sealed' => $sealed,
            'color' => $n['color'] ?? null,
            'tags' => array_values($n['tags'] ?? []),
            'notebookId' => $n['notebookId'] ?? null,
        ];
    }
    $config = [
        'notes' => $list,
        'notebooks' => array_values($notebooks),
        'unlocked' => $open,
        'labels' => $t,
        'locale' => $locale,
        'autosaveDelay' => (int) $autosaveDelay,
        'can' => ['update' => (bool) $update, 'create' => (bool) $create, 'delete' => (bool) $delete, 'duplicate' => (bool) $duplicate, 'seal' => (bool) $seal, 'unseal' => (bool) $unseal, 'unlock' => (bool) $unlock, 'lock' => (bool) $lock, 'share' => (bool) $shareUrl, 'notebooks' => (bool) $notebooksEdit],
        'shareUrl' => $shareUrl,
        'now' => $now ? $ms($now) : null,
        'scope' => $scope,
        'sort' => $sort,
        'view' => $view,
        'activeId' => $activeId,
    ];
    $filter = 'flex h-control-sm w-full items-center gap-2 rounded-control px-2.5 text-start text-label text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-nq-selected';
    $chip = 'inline-flex h-control-sm shrink-0 items-center gap-1.5 rounded-control border border-border bg-card px-2.5 text-label text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:border-primary aria-pressed:bg-nq-selected';
    $more = 'text-muted-foreground';
@endphp
<div data-slot="notes" x-data="nqNotes(@js($config))" x-on:keydown="onKey($event)" x-bind:data-view="view" {{ $attributes->cn('@container flex h-full min-h-0 w-full min-w-0 bg-background')->except('data-slot') }}>
    {{-- Sidebar --}}
    <nav aria-label="{{ $t['scopes'] }}" data-slot="notes-sidebar" class="hidden min-h-0 w-56 shrink-0 flex-col gap-4 overflow-y-auto border-e border-border p-3 @4xl:flex">
        <div class="flex flex-col gap-0.5">
            @foreach ([['all', 'sticky-note'], ['pinned', 'pin'], ['sealed', 'lock'], ['archive', 'archive']] as [$key, $icon])
                <button type="button" x-bind:aria-pressed="scope === '{{ $key }}'" x-on:click="scope = '{{ $key }}'" class="{{ $filter }}">
                    <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-4" />
                    <span class="min-w-0 flex-1 truncate">{{ $t[$key] }}</span>
                    <span class="ms-auto text-caption text-muted-foreground" x-text="num(counts['{{ $key }}'] ?? 0)"></span>
                </button>
            @endforeach
        </div>
        <div class="flex flex-col gap-1">
            <div class="flex items-center px-2.5">
                <h3 class="flex-1 text-caption font-medium uppercase text-muted-foreground">{{ $t['notebooks'] }}</h3>
                <template x-if="can.notebooks">
                    <button type="button" aria-label="{{ $t['newNotebook'] }}" x-on:click="openNotebook('create', null, null)" class="grid size-6 place-items-center rounded-control text-muted-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-folder-plus aria-hidden="true" class="size-4" />
                    </button>
                </template>
            </div>
            <div data-slot="notebook-list" role="group" aria-label="{{ $t['notebooks'] }}" class="flex flex-col gap-0.5">
                <template x-for="r in notebookRows" x-bind:key="r.notebook.id">
                    <x-nq::context-menu>
                        <x-nq::context-menu.trigger data-slot="notebook-row">
                            <button type="button" x-bind:aria-pressed="scope === r.scope" x-on:click="scope = r.scope" x-bind:style="'padding-inline-start:' + (0.625 + r.depth * 1) + 'rem'" class="{{ $filter }}">
                                <x-lucide-book-open aria-hidden="true" class="size-4" />
                                <span dir="auto" class="min-w-0 flex-1 truncate" x-text="r.notebook.name"></span>
                                <span class="ms-auto text-caption text-muted-foreground" x-text="num(counts[r.scope] ?? 0)"></span>
                            </button>
                        </x-nq::context-menu.trigger>
                        <template x-if="can.notebooks">
                            <x-nq::context-menu.content>
                                <x-nq::context-menu.item x-on:click="openNotebook('create', null, r.notebook.id)"><x-lucide-folder-plus aria-hidden="true" /><span>{{ $t['newNotebook'] }}</span></x-nq::context-menu.item>
                                <x-nq::context-menu.item x-on:click="openNotebook('rename', r.notebook)"><x-lucide-pencil aria-hidden="true" /><span>{{ $t['renameNotebook'] }}</span></x-nq::context-menu.item>
                                <x-nq::context-menu.separator />
                                <x-nq::context-menu.item variant="danger" x-on:click="openNotebook('delete', r.notebook)"><x-lucide-trash-2 aria-hidden="true" /><span>{{ $t['deleteNotebook'] }}</span></x-nq::context-menu.item>
                            </x-nq::context-menu.content>
                        </template>
                    </x-nq::context-menu>
                </template>
                <p x-show="!notebookRows.length" class="px-2.5 text-body-sm text-muted-foreground">{{ $t['noNotebooks'] }}</p>
            </div>
        </div>
        <div x-show="tagList.length" x-cloak class="flex flex-col gap-0.5">
            <h3 class="px-2.5 pb-1 text-caption font-medium uppercase text-muted-foreground">{{ $t['tags'] }}</h3>
            <template x-for="x in tagList" x-bind:key="x.tag">
                <button type="button" x-bind:aria-pressed="scope === 'tag:' + x.tag" x-on:click="scope = 'tag:' + x.tag" class="{{ $filter }}">
                    <x-lucide-tag aria-hidden="true" class="size-4" />
                    <span class="min-w-0 flex-1 truncate" x-text="x.tag"></span>
                    <span class="ms-auto text-caption text-muted-foreground" x-text="num(counts['tag:' + x.tag] ?? 0)"></span>
                </button>
            </template>
        </div>
    </nav>

    {{-- The list --}}
    <section data-slot="notes-view" x-bind:data-view="view" aria-label="{{ $t['notes'] }}"
        x-bind:class="view === 'grid'
            ? (activeId ? 'hidden' : 'flex flex-1')
            : (activeId ? 'hidden @2xl:flex @2xl:w-80 @4xl:w-96 @2xl:shrink-0 @2xl:border-e @2xl:border-border' : 'flex flex-1 @2xl:w-80 @2xl:flex-none @4xl:w-96 @2xl:shrink-0 @2xl:border-e @2xl:border-border')"
        class="min-h-0 min-w-0 flex-col">
        <div class="flex flex-col gap-2 border-b border-border p-3">
            <x-nq::input-group>
                <x-nq::input-group.addon><x-lucide-search aria-hidden="true" class="size-4 text-muted-foreground" /></x-nq::input-group.addon>
                <x-nq::input-group.input x-model="query" data-slot="notes-search" type="search" placeholder="{{ $t['searchPlaceholder'] }}" aria-label="{{ $t['search'] }}" />
                <x-nq::input-group.addon align="end" x-show="query" x-cloak>
                    <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['clearSearch'] }}" x-on:click="query = ''"><x-lucide-x aria-hidden="true" /></x-nq::button>
                </x-nq::input-group.addon>
            </x-nq::input-group>
            <div class="flex flex-wrap items-center gap-2">
                <template x-if="can.create">
                    <x-nq::button variant="primary" size="sm" data-slot="notes-new" x-on:click="create()" x-bind:aria-busy="busy === 'create' ? 'true' : null">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $t['newNote'] }}
                    </x-nq::button>
                </template>
                <span class="ms-auto"></span>
                <x-nq::dropdown-menu>
                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" class="{{ $more }}" x-bind:aria-label="t.sortBy + ': ' + t.sort[sort]"><x-lucide-arrow-down-up aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                    <x-nq::dropdown-menu.content align="end">
                        <x-nq::dropdown-menu.group>
                            <x-nq::dropdown-menu.label>{{ $t['sortBy'] }}</x-nq::dropdown-menu.label>
                            <x-nq::dropdown-menu.radio-group x-model="sort">
                                @foreach (['updated', 'created', 'title'] as $s)
                                    <x-nq::dropdown-menu.radio-item value="{{ $s }}">{{ $t['sort'][$s] }}</x-nq::dropdown-menu.radio-item>
                                @endforeach
                            </x-nq::dropdown-menu.radio-group>
                        </x-nq::dropdown-menu.group>
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
                <x-nq::toggle-group :default-value="[$view]" aria-label="{{ $t['viewMode'] }}" x-effect="if (value[0]) view = value[0]">
                    <x-nq::toggle-group.toggle value="list" aria-label="{{ $t['viewList'] }}"><x-lucide-list aria-hidden="true" /></x-nq::toggle-group.toggle>
                    <x-nq::toggle-group.toggle value="grid" aria-label="{{ $t['viewGrid'] }}"><x-lucide-layout-grid aria-hidden="true" /></x-nq::toggle-group.toggle>
                </x-nq::toggle-group>
                <x-nq::dropdown-menu>
                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" class="{{ $more }}" aria-label="{{ $t['listActions'] }}" data-slot="note-actions-trigger"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                    <x-nq::dropdown-menu.content align="end" class="min-w-52">
                        <template x-if="can.notebooks">
                            <x-nq::dropdown-menu.item x-on:click="openNotebook('create', null, currentNotebook ? currentNotebook.id : null)"><x-lucide-folder-plus aria-hidden="true" /><span>{{ $t['newNotebook'] }}</span></x-nq::dropdown-menu.item>
                        </template>
                        <template x-if="can.notebooks && currentNotebook">
                            <x-nq::dropdown-menu.item x-on:click="openNotebook('rename', currentNotebook)"><x-lucide-pencil aria-hidden="true" /><span>{{ $t['renameNotebook'] }}</span></x-nq::dropdown-menu.item>
                        </template>
                        <template x-if="can.notebooks && currentNotebook">
                            <x-nq::dropdown-menu.item variant="danger" x-on:click="openNotebook('delete', currentNotebook)"><x-lucide-trash-2 aria-hidden="true" /><span>{{ $t['deleteNotebook'] }}</span></x-nq::dropdown-menu.item>
                        </template>
                        <x-nq::dropdown-menu.separator />
                        <x-nq::dropdown-menu.item x-on:click="openDialog('exportAll')" x-bind:data-disabled="notes.length ? null : ''"><x-lucide-download aria-hidden="true" /><span>{{ $t['exportAll'] }}</span></x-nq::dropdown-menu.item>
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
            </div>
            <p x-show="listError" x-cloak role="alert" class="text-body-sm text-nq-danger-text" x-text="listError"></p>
        </div>

        <div role="group" aria-label="{{ $t['scopes'] }}" data-slot="notes-scope-bar" class="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none] @4xl:hidden [&::-webkit-scrollbar]:hidden">
            <template x-for="c in chips" x-bind:key="c.id">
                <button type="button" x-bind:aria-pressed="scope === c.id" x-on:click="scope = c.id" class="{{ $chip }}">
                    <x-lucide-archive x-show="c.id === 'archive'" aria-hidden="true" class="size-3.5" />
                    <span x-text="c.label"></span>
                    <span class="text-caption text-muted-foreground" x-text="num(counts[c.id] ?? 0)"></span>
                </button>
            </template>
        </div>

        <div data-slot="notes-list" class="min-h-0 flex-1 overflow-y-auto p-2">
            @if ($loading)
                <x-nq::states.loading :label="$t['loading']" :rows="5" />
            @elseif ($error)
                <x-nq::states.error :title="$t['failed']" :description="$error" />
            @else
                <div x-show="!shown.length" x-cloak data-slot="empty-state" class="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
                    <span data-slot="state-icon" class="inline-flex size-10 items-center justify-center rounded-control border border-border bg-card text-muted-foreground [&_svg]:size-5"><x-lucide-sticky-note aria-hidden="true" /></span>
                    <div class="flex max-w-sm flex-col gap-1">
                        <p class="text-label text-foreground" x-text="emptyState.title"></p>
                        <p class="text-body-sm text-muted-foreground" x-text="emptyState.hint"></p>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-2">
                        <x-nq::button variant="secondary" size="sm" x-show="emptyState.kind === 'search'" x-on:click="query = ''">{{ $t['clearSearch'] }}</x-nq::button>
                        <x-nq::button variant="primary" size="sm" x-show="emptyState.kind === 'new' && can.create" x-on:click="create()"><x-lucide-plus aria-hidden="true" />{{ $t['newNote'] }}</x-nq::button>
                    </div>
                </div>
                <template x-for="g in groups" x-bind:key="g.kind">
                    <div data-slot="note-group" x-bind:data-group="g.kind" class="flex flex-col gap-1">
                        <h3 x-show="g.kind !== 'all'" class="flex items-center gap-1.5 px-3 pb-1 pt-3 text-caption font-medium uppercase text-muted-foreground">
                            <x-lucide-pin x-show="g.kind === 'pinned'" aria-hidden="true" class="size-3" />
                            <span x-text="g.label"></span>
                            <span class="font-normal" x-text="num(g.notes.length)"></span>
                        </h3>
                        <ul role="list" x-bind:aria-label="g.label"
                            x-bind:class="view === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.5rem),1fr))] gap-2.5 px-1' : 'flex flex-col gap-0.5'"
                            class="m-0 list-none p-0">
                            {{-- board cards --}}
                            <template x-for="n in (view === 'grid' ? g.notes : [])" x-bind:key="n.id">
                                <li class="contents">
                                    <x-nq::context-menu>
                                        <x-nq::context-menu.trigger data-slot="note-card" x-bind:data-active="n.id === activeId ? '' : null" x-bind:data-color="n.color || null" x-bind:style="tint(n)"
                                            class="group/note relative flex min-h-32 min-w-0 flex-col rounded-card border border-border bg-card transition-shadow duration-150 ease-nq hover:shadow-sm data-active:outline-2 data-active:outline-nq-focus">
                                            <button type="button" data-slot="note-open" x-bind:aria-current="n.id === activeId ? 'true' : null" x-on:click="openNote(n.id)" x-on:keydown="onRowKey($event, n)"
                                                class="flex min-w-0 flex-1 flex-col gap-2 rounded-card p-3 text-start focus-visible:outline-2 focus-visible:outline-nq-focus">
                                                <span class="flex min-w-0 items-center gap-1.5 pe-8">
                                                    <x-lucide-lock x-show="n.sealed && locked(n)" role="img" aria-label="{{ $t['sealedNote'] }}" class="size-3.5 shrink-0 text-muted-foreground" />
                                                    <x-lucide-lock-open x-show="n.sealed && !locked(n)" role="img" aria-label="{{ $t['unlockedBanner'] }}" class="size-3.5 shrink-0 text-muted-foreground" />
                                                    <x-lucide-pin x-show="n.pinned" role="img" aria-label="{{ $t['pinnedBadge'] }}" class="size-3.5 shrink-0 text-muted-foreground" />
                                                    <span dir="auto" class="min-w-0 flex-1 truncate text-label text-foreground" x-text="titleOf(n)"></span>
                                                </span>
                                                <span dir="auto">
                                                    <span x-show="locked(n)" class="flex items-center gap-1.5 text-body-sm text-muted-foreground"><x-lucide-lock aria-hidden="true" class="size-3.5" />{{ $t['sealedHint'] }}</span>
                                                    <span x-show="!locked(n)" class="line-clamp-6 text-body-sm text-muted-foreground" x-text="snippet(n)"></span>
                                                </span>
                                                <span class="mt-auto flex min-w-0 flex-col gap-1.5 pt-1">
                                                    <span class="flex min-w-0 flex-wrap items-center gap-1">
                                                        <x-nq::badge variant="outline" class="max-w-full" x-show="pathOf(n).length"><span class="truncate" x-text="pathOf(n).join(' / ')"></span></x-nq::badge>
                                                        <template x-for="tag in (n.tags || []).slice(0, 3)" x-bind:key="tag"><x-nq::badge variant="neutral" class="max-w-32"><span class="truncate" x-text="tag"></span></x-nq::badge></template>
                                                    </span>
                                                    <span class="text-caption text-muted-foreground" x-text="rel(n.updatedAt)"></span>
                                                </span>
                                            </button>
                                            <x-nq::dropdown-menu>
                                                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="note-actions-trigger" x-bind:aria-label="fill(t.actionsFor, titleOf(n))"
                                                    class="absolute end-1.5 top-1.5 text-muted-foreground opacity-0 transition-opacity group-hover/note:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                                                <x-nq::dropdown-menu.content align="end" class="min-w-52"><x-nq::notes.menu-items /></x-nq::dropdown-menu.content>
                                            </x-nq::dropdown-menu>
                                        </x-nq::context-menu.trigger>
                                        <x-nq::context-menu.content><x-nq::notes.context-items /></x-nq::context-menu.content>
                                    </x-nq::context-menu>
                                </li>
                            </template>
                            {{-- list rows --}}
                            <template x-for="n in (view === 'grid' ? [] : g.notes)" x-bind:key="n.id">
                                <li class="contents">
                                    <x-nq::context-menu>
                                        <x-nq::context-menu.trigger data-slot="note-row" x-bind:data-active="n.id === activeId ? '' : null" x-bind:data-color="n.color || null" x-bind:style="stripe(n)"
                                            class="group/note relative rounded-control border-s-[3px] border-transparent hover:bg-nq-hover data-active:bg-nq-selected">
                                            <button type="button" data-slot="note-open" x-bind:aria-current="n.id === activeId ? 'true' : null" x-on:click="openNote(n.id)" x-on:keydown="onRowKey($event, n)"
                                                class="flex w-full min-w-0 flex-col gap-1 rounded-control px-3 py-2.5 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                                                <span class="flex min-w-0 items-center gap-1.5 pe-8">
                                                    <x-lucide-lock x-show="n.sealed && locked(n)" role="img" aria-label="{{ $t['sealedNote'] }}" class="size-3.5 shrink-0 text-muted-foreground" />
                                                    <x-lucide-lock-open x-show="n.sealed && !locked(n)" role="img" aria-label="{{ $t['unlockedBanner'] }}" class="size-3.5 shrink-0 text-muted-foreground" />
                                                    <x-lucide-pin x-show="n.pinned" role="img" aria-label="{{ $t['pinnedBadge'] }}" class="size-3.5 shrink-0 text-muted-foreground" />
                                                    <span dir="auto" class="min-w-0 flex-1 truncate text-label text-foreground" x-text="titleOf(n)"></span>
                                                    <span class="shrink-0 text-caption text-muted-foreground" x-text="rel(n.updatedAt)"></span>
                                                </span>
                                                <span dir="auto">
                                                    <span x-show="locked(n)" class="flex items-center gap-1.5 text-body-sm text-muted-foreground"><x-lucide-lock aria-hidden="true" class="size-3.5" />{{ $t['sealedHint'] }}</span>
                                                    <span x-show="!locked(n)" class="line-clamp-2 text-body-sm text-muted-foreground" x-text="snippet(n)"></span>
                                                </span>
                                                <span x-show="pathOf(n).length || (n.tags && n.tags.length)" class="flex min-w-0 flex-wrap items-center gap-1">
                                                    <x-nq::badge variant="outline" class="max-w-full" x-show="pathOf(n).length"><span class="truncate" x-text="pathOf(n).join(' / ')"></span></x-nq::badge>
                                                    <template x-for="tag in (n.tags || []).slice(0, 3)" x-bind:key="tag"><x-nq::badge variant="neutral" class="max-w-32"><span class="truncate" x-text="tag"></span></x-nq::badge></template>
                                                </span>
                                            </button>
                                            <x-nq::dropdown-menu>
                                                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="note-actions-trigger" x-bind:aria-label="fill(t.actionsFor, titleOf(n))"
                                                    class="absolute end-1.5 top-1.5 text-muted-foreground opacity-0 transition-opacity group-hover/note:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                                                <x-nq::dropdown-menu.content align="end" class="min-w-52"><x-nq::notes.menu-items /></x-nq::dropdown-menu.content>
                                            </x-nq::dropdown-menu>
                                        </x-nq::context-menu.trigger>
                                        <x-nq::context-menu.content><x-nq::notes.context-items /></x-nq::context-menu.content>
                                    </x-nq::context-menu>
                                </li>
                            </template>
                        </ul>
                    </div>
                </template>
            @endif
        </div>
    </section>

    {{-- The editor --}}
    <div data-slot="note-editor" x-bind:class="activeId ? 'flex' : (view === 'grid' ? 'hidden' : 'hidden @2xl:flex')" class="min-h-0 min-w-0 flex-1 flex-col">
        <div x-show="!activeId" class="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
            <p class="text-h3 text-foreground">{{ $t['pickOne'] }}</p>
            <p class="text-body-sm text-muted-foreground">{{ $t['pickOneHint'] }}</p>
        </div>
        <template x-for="n in openList" x-bind:key="n.id">
            <x-nq::context-menu class="contents">
                <x-nq::context-menu.trigger data-slot="note-editor-body" x-bind:data-color="n.color || null" x-bind:aria-label="title.trim() || t.untitled" role="article" x-on:keydown="onEditorKey($event)"
                    class="flex min-h-0 flex-1 flex-col">
                    <header class="flex items-center gap-1.5 border-b border-border px-3 py-2" x-bind:style="n.color ? 'border-bottom-color:color-mix(in oklab, var(--nq-tag-' + n.color + ') 45%, transparent)' : ''">
                        <x-nq::button variant="ghost" size="sm" data-slot="note-back" class="gap-1.5 @2xl:hidden" x-bind:class="view === 'grid' ? '@2xl:inline-flex' : ''" x-on:click="back()">
                            <x-lucide-arrow-left aria-hidden="true" class="rtl:rotate-180" />
                            {{ $t['back'] }}
                        </x-nq::button>
                        <span role="status" aria-live="polite" data-slot="note-save-status" x-bind:data-status="save.status" x-bind:class="save.status === 'error' ? 'text-nq-danger-text' : 'text-muted-foreground'" class="flex min-w-0 items-center gap-1.5 text-caption">
                            <x-lucide-loader-circle x-show="save.status === 'saving'" aria-hidden="true" class="size-3.5 animate-spin" />
                            <span x-show="save.status === 'dirty'" aria-hidden="true" class="size-1.5 rounded-full bg-[var(--nq-tag-amber)]"></span>
                            <x-lucide-circle-alert x-show="save.status === 'error'" aria-hidden="true" class="size-3.5" />
                            <x-lucide-check x-show="save.status === 'idle' || save.status === 'saved'" aria-hidden="true" class="size-3.5" />
                            <span class="truncate" x-text="statusText"></span>
                            <x-nq::button variant="link" size="sm" x-show="save.status === 'error'" x-on:click="flush()">{{ $t['saveNow'] }}</x-nq::button>
                        </span>
                        <span class="ms-auto"></span>
                        <template x-if="has(n, 'pin')">
                            <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="n.pinned ? t.unpin : t.pin" x-bind:aria-pressed="n.pinned ? 'true' : 'false'" x-bind:class="n.pinned ? 'text-foreground' : 'text-muted-foreground'" x-on:click="pick(n, 'pin')">
                                <x-lucide-pin-off x-show="n.pinned" aria-hidden="true" /><x-lucide-pin x-show="!n.pinned" aria-hidden="true" />
                            </x-nq::button>
                        </template>
                        <template x-if="has(n, 'share')">
                            <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['share'] }}" class="text-muted-foreground" x-bind:data-disabled="off(n, 'share') ? '' : null" x-on:click="pick(n, 'share')"><x-lucide-share-2 aria-hidden="true" /></x-nq::button>
                        </template>
                        <x-nq::dropdown-menu>
                            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="note-actions-trigger" aria-label="{{ $t['noteActions'] }}" class="text-muted-foreground"><x-lucide-ellipsis aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                            <x-nq::dropdown-menu.content align="end" class="min-w-52"><x-nq::notes.menu-items :in-editor="true" /></x-nq::dropdown-menu.content>
                        </x-nq::dropdown-menu>
                    </header>

                    <div class="min-h-0 flex-1 overflow-y-auto" x-bind:style="n.color ? 'background:color-mix(in oklab, var(--nq-tag-' + n.color + '-soft) 40%, transparent)' : ''">
                        <div class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-4 @2xl:px-8">
                            <input type="text" x-model="title" dir="auto" placeholder="{{ $t['titlePlaceholder'] }}" aria-label="{{ $t['titleLabel'] }}" x-bind:disabled="!can.update" data-slot="note-title"
                                x-on:input="onTitle()" x-on:blur="flush()"
                                class="w-full bg-transparent text-h1 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-nq-focus" />
                            <div role="group" aria-label="{{ $t['properties'] }}" data-slot="note-properties" class="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-caption text-muted-foreground">
                                <x-nq::button variant="ghost" size="sm" class="max-w-full gap-1.5 text-muted-foreground" aria-label="{{ $t['move'] }}" x-bind:disabled="!has(n, 'move')" x-bind:data-disabled="has(n, 'move') ? null : ''" x-on:click="pick(n, 'move')">
                                    <x-lucide-folder-input aria-hidden="true" />
                                    <span class="truncate" x-text="pathOf(n).length ? pathOf(n).join(' / ') : t.moveNone"></span>
                                </x-nq::button>
                                <x-nq::button variant="ghost" size="sm" class="max-w-full gap-1.5 text-muted-foreground" aria-label="{{ $t['editTags'] }}" x-bind:disabled="!has(n, 'tags')" x-bind:data-disabled="has(n, 'tags') ? null : ''" x-on:click="pick(n, 'tags')">
                                    <x-lucide-tag aria-hidden="true" />
                                    <span x-show="n.tags && n.tags.length" class="flex flex-wrap gap-1"><template x-for="tag in (n.tags || [])" x-bind:key="tag"><x-nq::badge variant="neutral"><span x-text="tag"></span></x-nq::badge></template></span>
                                    <span x-show="!(n.tags && n.tags.length)">{{ $t['tags'] }}</span>
                                </x-nq::button>
                                <x-nq::button variant="ghost" size="sm" class="max-w-full gap-1.5 text-muted-foreground" aria-label="{{ $t['color'] }}" x-bind:disabled="!has(n, 'color')" x-bind:data-disabled="has(n, 'color') ? null : ''" x-on:click="pick(n, 'color')">
                                    <x-lucide-palette aria-hidden="true" />
                                    <span x-show="n.color" aria-hidden="true" class="size-3 rounded-full border border-border" x-bind:style="n.color ? 'background:var(--nq-tag-' + n.color + ')' : ''"></span>
                                </x-nq::button>
                                <span class="px-2" x-text="fill(t.updated, rel(n.updatedAt))"></span>
                            </div>

                            <template x-if="locked(n)">
                                <form data-slot="note-unlock" x-on:submit.prevent="unlock()" class="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5">
                                    <div class="flex items-center gap-2 text-h3 text-foreground"><x-lucide-lock aria-hidden="true" class="size-4" />{{ $t['locked'] }}</div>
                                    <p class="text-body-sm text-muted-foreground">{{ $t['lockedHint'] }}</p>
                                    <x-nq::password-input x-model="unlockPassword" autocomplete="current-password" aria-label="{{ $t['password'] }}" placeholder="{{ $t['password'] }}" aria-describedby="note-unlock-error" />
                                    <p x-show="err.unlock" x-cloak id="note-unlock-error" role="alert" class="text-body-sm text-nq-danger-text" x-text="err.unlock"></p>
                                    <x-nq::button type="submit" variant="primary" x-bind:disabled="!unlockPassword || !can.unlock" x-bind:aria-busy="busy === 'unlock' ? 'true' : null">{{ $t['unlock'] }}</x-nq::button>
                                </form>
                            </template>
                            <template x-if="!locked(n)">
                                <div class="contents">
                                    <div x-show="n.sealed" class="flex items-center gap-2 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm text-muted-foreground" data-slot="note-unlocked">
                                        <x-lucide-lock aria-hidden="true" class="size-3.5" />
                                        <span class="flex-1">{{ $t['unlockedBanner'] }}</span>
                                        <x-nq::button variant="secondary" size="sm" x-show="can.lock" x-on:click="lock(n.id)">{{ $t['lockNow'] }}</x-nq::button>
                                    </div>
                                    <template x-if="n.format === 'markdown'">
                                        <div class="flex min-w-0 flex-col gap-2" data-slot="note-markdown">
                                            <div class="flex items-center gap-2">
                                                <x-nq::toggle-group :default-value="['write']" aria-label="{{ $t['formatMarkdown'] }}" x-effect="if (value[0]) mode = value[0]">
                                                    <x-nq::toggle-group.toggle value="write">{{ $t['write'] }}</x-nq::toggle-group.toggle>
                                                    <x-nq::toggle-group.toggle value="preview">{{ $t['preview'] }}</x-nq::toggle-group.toggle>
                                                </x-nq::toggle-group>
                                                <span class="ms-auto"></span>
                                                <div x-show="mode === 'write'" class="flex items-center gap-1">
                                                    <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['formats']['bold'] }}" x-on:click="applyFormat('bold')"><x-lucide-bold aria-hidden="true" /></x-nq::button>
                                                    <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['formats']['italic'] }}" x-on:click="applyFormat('italic')"><x-lucide-italic aria-hidden="true" /></x-nq::button>
                                                    <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['formats']['link'] }}" x-on:click="applyFormat('link')"><x-lucide-link-2 aria-hidden="true" /></x-nq::button>
                                                    <x-nq::dropdown-menu>
                                                        <x-nq::dropdown-menu.trigger variant="ghost" size="sm" aria-label="{{ $t['formatTitle'] }}"><x-lucide-heading-2 aria-hidden="true" />{{ $t['format'] }}</x-nq::dropdown-menu.trigger>
                                                        <x-nq::dropdown-menu.content align="end" class="min-w-48">
                                                            @foreach (['bold', 'italic', 'strike', 'code', 'link', 'wikilink', 'h1', 'h2', 'h3', 'quote', 'bullet', 'ordered', 'task'] as $key)
                                                                <x-nq::dropdown-menu.item x-on:click="applyFormat('{{ $key }}')">
                                                                    @if ($key === 'code')<x-lucide-code aria-hidden="true" />@elseif ($key === 'task')<x-lucide-list-checks aria-hidden="true" />@endif
                                                                    {{ $t['formats'][$key] }}
                                                                </x-nq::dropdown-menu.item>
                                                            @endforeach
                                                        </x-nq::dropdown-menu.content>
                                                    </x-nq::dropdown-menu>
                                                </div>
                                            </div>
                                            <textarea x-show="mode === 'write'" x-model="body" dir="auto" placeholder="{{ $t['bodyPlaceholder'] }}" aria-label="{{ $t['bodyLabel'] }}" x-bind:disabled="!can.update" data-slot="note-body"
                                                x-on:input="schedule()" x-on:blur="flush()" x-on:keydown="onAreaKey($event)"
                                                class="min-h-64 w-full resize-y rounded-control border border-border bg-transparent p-3 font-mono text-code text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"></textarea>
                                            <div x-show="mode === 'preview' && body.trim()" data-slot="note-preview" x-on:click="onPreviewClick($event)" class="whitespace-pre-wrap text-body text-foreground" x-html="previewHtml"></div>
                                            <p x-show="mode === 'preview' && !body.trim()" class="text-body-sm text-muted-foreground">{{ $t['nothingToPreview'] }}</p>
                                        </div>
                                    </template>
                                    <template x-if="n.format !== 'markdown'">
                                        <div class="flex min-w-0 flex-col gap-2" data-slot="note-rich">
                                            <div role="toolbar" aria-label="{{ $t['formatRich'] }}" class="flex items-center gap-1">
                                                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['formats']['bold'] }}" x-bind:disabled="!can.update" x-on:mousedown.prevent x-on:click="richCommand('bold')"><x-lucide-bold aria-hidden="true" /></x-nq::button>
                                                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['formats']['italic'] }}" x-bind:disabled="!can.update" x-on:mousedown.prevent x-on:click="richCommand('italic')"><x-lucide-italic aria-hidden="true" /></x-nq::button>
                                                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['formats']['bullet'] }}" x-bind:disabled="!can.update" x-on:mousedown.prevent x-on:click="richCommand('insertUnorderedList')"><x-lucide-list aria-hidden="true" /></x-nq::button>
                                                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t['formats']['ordered'] }}" x-bind:disabled="!can.update" x-on:mousedown.prevent x-on:click="richCommand('insertOrderedList')"><x-lucide-list-ordered aria-hidden="true" /></x-nq::button>
                                            </div>
                                            <div data-slot="note-body" dir="auto" role="textbox" aria-multiline="true" aria-label="{{ $t['bodyLabel'] }}" x-bind:contenteditable="can.update ? 'true' : 'false'" x-init="$el.innerHTML = clean(body)"
                                                x-on:input="onRich($event)" x-on:blur="flush()" x-on:keydown.capture="touch()" x-on:pointerdown.capture="touch()" x-on:paste.capture="touch()"
                                                class="min-h-64 w-full rounded-control border border-border bg-transparent p-3 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus [&_a]:underline [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6"></div>
                                        </div>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </div>

                    <footer x-show="!locked(n)" data-slot="note-footer" class="flex flex-col gap-1 border-t border-border px-4 py-2 text-caption text-muted-foreground">
                        <div class="flex flex-wrap items-center gap-x-3">
                            <span x-text="fill(t.words, num(words))"></span>
                            <span x-text="fill(t.readMinutes, num(readMin))"></span>
                            <span x-text="fill(t.created, rel(n.createdAt))"></span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5" data-slot="note-links">
                            <span class="font-medium">{{ $t['backlinks'] }}</span>
                            <template x-for="b in backlinks" x-bind:key="b.id"><x-nq::button variant="secondary" size="sm" x-bind:aria-label="fill(t.openNote, b.title)" class="max-w-48" x-on:click="openNote(b.id)"><span dir="auto" class="truncate" x-text="b.title || '…'"></span></x-nq::button></template>
                            <span x-show="!backlinks.length">{{ $t['noBacklinks'] }}</span>
                        </div>
                        <div x-show="links.length" class="flex flex-wrap items-center gap-1.5" data-slot="note-links">
                            <span class="font-medium">{{ $t['linksTo'] }}</span>
                            <template x-for="l in links" x-bind:key="l.id"><x-nq::button variant="secondary" size="sm" x-bind:aria-label="fill(t.openNote, l.title)" class="max-w-48" x-on:click="openNote(l.id)"><span dir="auto" class="truncate" x-text="l.title || '…'"></span></x-nq::button></template>
                        </div>
                    </footer>
                </x-nq::context-menu.trigger>
                <x-nq::context-menu.content><x-nq::notes.context-items :in-editor="true" /></x-nq::context-menu.content>
            </x-nq::context-menu>
        </template>
    </div>

    @include('nasaq::components.notes.dialogs', ['t' => $t, 'locale' => $locale])
</div>

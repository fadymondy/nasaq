{{-- <x-nq::desktop-os-shell :apps="[['id' => 'files', 'title' => 'Files', 'icon' => 'folder', 'content' => '<p class=&quot;p-4&quot;>Files</p>']]" :menus="[['id' => 'file', 'label' => 'File', 'items' => [['id' => 'new', 'label' => 'New window']]]]" />
     A desktop in the browser: a wallpaper, a menu bar, a dock, a launchpad and draggable, resizable windows (snap to the left, right or top edge, maximise, minimise).
     apps: id, title, icon (a lucide name, wrapped in the app-icon tile) or icon-html (trusted HTML for the tile), content (trusted HTML for the window body, started as its own Alpine tree),
     size ['w' => , 'h' => ] (the starting window size), single (one window only), pinned (false keeps it off the dock until it runs), keywords (launchpad search).
     menus: the menu bar. id, label, items [id, label, shortcut, disabled, danger, separated, confirm]. Choosing an item fires a bubbling "nq-desktop-menu" { id: "menuId.itemId" }. The menus are fixed:
     the React shell's function of the focused app is not ported. An item with confirm [title, description, confirmLabel, danger] asks through <x-nq::confirm-provider> first and fires only on Confirm.
     \Nasaq\DesktopPowerMenu::make(['actions' => ['about', 'settings', 'sleep', 'restart', 'shutDown', 'logOut'], 'appName' => 'ToGO', 'confirm' => true]) builds the system menu (id "system"; React's desktopPowerMenu).
     launchpad: start with the launchpad open (x-modelable: x-model="$wire.launchpad"). compact-below: below this width (default 640) windows fill the area, one at a time.
     Slots: the default slot is the desktop itself (put <x-nq::desktop-icons> there; "nq-desktop-icon-open" opens its app), wallpaper, menuBarStart, menuBarEnd.
     Events (bubbling, from the root): "nq-windows-change" { windows }, "nq-launchpad-change" { open }, "nq-desktop-menu" { id }.
     labels: ['launchpad','searchApps','noApps','close','minimise','maximise','restore','dock','desktop','menuBar','running'].
     Not ported: the dock's context menu (open, new window, close all). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['apps' => [], 'menus' => [], 'launchpad' => false, 'compactBelow' => 640, 'labels' => [], 'menuBarStart' => null, 'menuBarEnd' => null, 'wallpaper' => null])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $t = fn (string $key, string $en, string $ar) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $ar);
    $rows = collect($apps)->map(function ($a) {
        $tile = $a['iconHtml'] ?? \Illuminate\Support\Facades\Blade::render('<x-nq::desktop-os-shell.app-icon :icon="$icon" />', ['icon' => $a['icon'] ?? 'app-window']);
        return array_filter([
            'id' => $a['id'],
            'title' => $a['title'],
            'iconHtml' => $tile,
            'content' => $a['content'] ?? '',
            'size' => $a['size'] ?? null,
            'single' => ! empty($a['single']) ? true : null,
            'pinned' => array_key_exists('pinned', $a) ? (bool) $a['pinned'] : null,
            'keywords' => $a['keywords'] ?? null,
        ], fn ($v) => $v !== null);
    })->values()->all();
    $options = array_filter(['compactBelow' => (int) $compactBelow !== 640 ? (int) $compactBelow : null, 'launchpad' => $launchpad ?: null], fn ($v) => $v !== null);
    $menuClick = 'menuPick($el.dataset.id, $el.dataset.confirm)';
    $handles = [
        'n' => 'inset-x-2 top-0 h-1.5 cursor-ns-resize',
        's' => 'inset-x-2 bottom-0 h-1.5 cursor-ns-resize',
        'e' => 'inset-y-2 end-0 w-1.5 cursor-ew-resize',
        'w' => 'inset-y-2 start-0 w-1.5 cursor-ew-resize',
        'ne' => 'top-0 end-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize',
        'nw' => 'top-0 start-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize',
        'se' => 'bottom-0 end-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize',
        'sw' => 'bottom-0 start-0 size-3 cursor-nesw-resize rtl:cursor-nwse-resize',
    ];
    $control = 'grid size-6 place-items-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus';
    $minimise = $t('minimise', 'Minimise', 'تصغير');
    $maximise = $t('maximise', 'Maximise', 'تكبير');
    $restore = $t('restore', 'Restore', 'استعادة');
    $close = $t('close', 'Close', 'إغلاق');
    $launchpadLabel = $t('launchpad', 'Launchpad', 'لوحة التطبيقات');
    $searchApps = $t('searchApps', 'Search apps', 'ابحث في التطبيقات');
@endphp
<div data-slot="desktop-shell" x-data="nqDesktopShell({!! $js($rows) !!}, {!! $js((object) $options) !!})" x-modelable="launchpad"
    x-bind:data-compact="compact() ? '' : null" x-on:nq-desktop-icon-open="openById($event.detail.id)"
    {{ $attributes->cn('relative isolate flex h-full min-h-96 w-full flex-col overflow-hidden bg-background text-foreground') }}>
    <div aria-hidden="true" class="absolute inset-0 -z-10">
        @if ($wallpaper && ! $wallpaper->isEmpty())
            {{ $wallpaper }}
        @else
            <div class="size-full bg-[radial-gradient(120%_90%_at_20%_0%,color-mix(in_oklab,var(--nq-action)_28%,transparent),transparent_60%),radial-gradient(90%_80%_at_100%_100%,color-mix(in_oklab,var(--nq-success)_22%,transparent),transparent_60%)]"></div>
        @endif
    </div>
    <div data-slot="desktop-menu-bar" role="presentation" aria-label="{{ $t('menuBar', 'Menu bar', 'شريط القوائم') }}"
        class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 bg-card/70 px-2 text-caption backdrop-blur-md">
        {{ $menuBarStart }}
        <span x-show="focusedTitle()" x-text="focusedTitle()" class="px-2 text-label font-semibold text-foreground"></span>
        @if (count($menus))
            <x-nq::menubar class="h-6 min-h-0 border-0 bg-transparent p-0">
                @foreach ($menus as $menu)
                    <x-nq::menubar.menu>
                        <x-nq::menubar.trigger class="min-h-0 px-2 text-caption">{{ $menu['label'] }}</x-nq::menubar.trigger>
                        <x-nq::menubar.content>
                            @foreach ($menu['items'] as $item)
                                <div role="none">
                                    @if (! empty($item['separated']))<x-nq::menubar.separator />@endif
                                    <x-nq::menubar.item :variant="! empty($item['danger']) ? 'danger' : 'default'" :shortcut="$item['shortcut'] ?? null" :disabled="! empty($item['disabled'])"
                                        data-id="{{ $menu['id'].'.'.$item['id'] }}" :data-confirm="! empty($item['confirm']) ? rawurlencode(json_encode($item['confirm'], JSON_UNESCAPED_UNICODE)) : null" :x-on:click="$menuClick">{{ $item['label'] }}</x-nq::menubar.item>
                                </div>
                            @endforeach
                        </x-nq::menubar.content>
                    </x-nq::menubar.menu>
                @endforeach
            </x-nq::menubar>
        @endif
        <div class="ms-auto flex items-center gap-3 px-2 text-muted-foreground">{{ $menuBarEnd }}</div>
    </div>
    <div x-ref="area" role="region" aria-label="{{ $t('desktop', 'Desktop', 'سطح المكتب') }}" class="relative min-h-0 flex-1">
        @if (! $slot->isEmpty())<div class="absolute inset-0">{{ $slot }}</div>@endif
        <div x-show="preview" x-cloak data-slot="desktop-snap-preview" aria-hidden="true" x-bind:style="previewStyle()"
            class="pointer-events-none absolute rounded-xl border-2 border-primary/60 bg-primary/10"></div>
        <template x-for="win in windows" x-bind:key="win.id">
            <section data-slot="desktop-window" x-show="appOf(win.appId)" x-bind:aria-label="appOf(win.appId)?.title"
                x-bind:data-focused="top()?.id === win.id ? '' : null" x-bind:data-maximised="shown(win).maximised ? '' : null"
                x-bind:hidden="shown(win).minimised" x-bind:style="frameStyle(win)" x-on:pointerdown.capture="focusWin(win.id)"
                x-bind:class="[isFull(shown(win)) ? 'rounded-none border-border' : 'rounded-xl shadow-lg', top()?.id === win.id ? 'border-border shadow-2xl' : 'border-border/60']"
                class="absolute flex flex-col overflow-hidden border bg-card text-foreground">
                <div data-slot="desktop-window-title" x-on:pointerdown="beginMove($event, win)" x-on:dblclick="compact() || maximiseWin(win.id)"
                    x-bind:class="compact() ? '' : 'cursor-default [touch-action:none]'"
                    class="flex h-9 shrink-0 select-none items-center gap-2 border-b border-border bg-secondary/60 ps-2 pe-1">
                    <span class="size-5 shrink-0" x-html="appOf(win.appId)?.iconHtml"></span>
                    <span x-text="appOf(win.appId)?.title" x-bind:class="top()?.id === win.id ? 'text-foreground' : 'text-muted-foreground'" class="min-w-0 flex-1 truncate text-label"></span>
                    <button type="button" data-action="minimise" class="{{ $control }}" aria-label="{{ $minimise }}" title="{{ $minimise }}" x-on:click="minimiseWin(win.id)">
                        <x-lucide-minus aria-hidden="true" class="size-3.5" />
                    </button>
                    <button type="button" data-action="maximise" x-show="! compact()" class="{{ $control }}" x-bind:aria-label="win.maximised ? '{{ $restore }}' : '{{ $maximise }}'" x-bind:title="win.maximised ? '{{ $restore }}' : '{{ $maximise }}'" x-on:click="maximiseWin(win.id)">
                        <x-lucide-minimize-2 x-show="win.maximised" aria-hidden="true" class="size-3.5" />
                        <x-lucide-maximize-2 x-show="! win.maximised" aria-hidden="true" class="size-3.5" />
                    </button>
                    <button type="button" data-action="close" class="{{ $control }} hover:bg-nq-danger hover:text-background" aria-label="{{ $close }}" title="{{ $close }}" x-on:click="closeWin(win.id)">
                        <x-lucide-x aria-hidden="true" class="size-3.5" />
                    </button>
                </div>
                <div data-slot="desktop-window-body" class="min-h-0 flex-1 overflow-auto" x-init="mount($el, win.appId)"></div>
                @foreach ($handles as $handle => $class)
                    <div aria-hidden="true" data-handle="{{ $handle }}" x-show="! isFull(shown(win)) && ! compact()" x-on:pointerdown="beginResize($event, win, '{{ $handle }}')"
                        class="absolute z-10 [touch-action:none] {{ $class }}"></div>
                @endforeach
            </section>
        </template>
        <div class="pointer-events-none absolute inset-x-0 bottom-2 z-[850] flex justify-center px-2">
            <nav data-slot="desktop-dock" aria-label="{{ $t('dock', 'Dock', 'الشريط السفلي') }}"
                class="pointer-events-auto flex max-w-full items-end gap-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-lg backdrop-blur-md">
                <button type="button" data-action="launchpad" aria-label="{{ $launchpadLabel }}" title="{{ $launchpadLabel }}" x-bind:aria-pressed="launchpad ? 'true' : 'false'" x-on:click="setLaunchpad(! launchpad)"
                    class="grid size-11 place-items-center rounded-xl bg-secondary text-foreground outline-none transition-transform duration-150 ease-nq hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <x-lucide-layout-grid aria-hidden="true" class="size-5" />
                </button>
                <span aria-hidden="true" class="mx-0.5 h-8 w-px self-center bg-border"></span>
                <template x-for="app in dockApps()" x-bind:key="app.id">
                    <button type="button" data-dock-app x-bind:data-app="app.id" x-bind:aria-label="app.title" x-bind:title="app.title"
                        x-bind:data-running="running(app) ? '' : null" x-bind:data-focused="isFocused(app) ? '' : null" x-on:click="activate(app)"
                        class="group relative flex size-11 flex-col items-center rounded-xl outline-none transition-transform duration-150 ease-nq hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus">
                        <span class="size-11" x-html="app.iconHtml"></span>
                        <span x-show="running(app)" aria-hidden="true" class="absolute -bottom-1 size-1 rounded-full bg-foreground"></span>
                        <span x-show="running(app)" class="sr-only">{{ $t('running', 'Running', 'قيد التشغيل') }}</span>
                    </button>
                </template>
            </nav>
        </div>
        <div x-show="launchpad" x-cloak data-slot="desktop-launchpad" role="dialog" aria-modal="true" aria-label="{{ $launchpadLabel }}"
            x-on:keydown.escape.stop="setLaunchpad(false)" x-on:pointerdown="($event.target === $el || $event.target.dataset.launchpadGrid !== undefined) && setLaunchpad(false)"
            class="absolute inset-0 z-[900] flex flex-col items-center gap-8 overflow-y-auto bg-background/70 px-6 pt-10 pb-28 backdrop-blur-xl">
            <div class="relative w-full max-w-xs">
                <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
                <x-nq::field.input type="search" x-model="query" x-on:keydown.enter="pickFirst()" aria-label="{{ $searchApps }}" placeholder="{{ $searchApps }}" class="ps-9" />
            </div>
            <ul x-show="shownApps().length" data-launchpad-grid="" class="grid w-full max-w-3xl grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-4 gap-y-6">
                <template x-for="app in shownApps()" x-bind:key="app.id">
                    <li class="flex justify-center">
                        <button type="button" data-launchpad-app x-bind:data-app="app.id" x-on:click="activate(app)"
                            class="flex w-22 flex-col items-center gap-2 rounded-xl p-1 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <span class="size-16" x-html="app.iconHtml"></span>
                            <span class="max-w-full truncate" x-text="app.title"></span>
                        </button>
                    </li>
                </template>
            </ul>
            <p x-show="! shownApps().length" class="text-body text-muted-foreground">{{ $t('noApps', 'No apps match', 'لا توجد تطبيقات مطابقة') }}</p>
        </div>
    </div>
</div>

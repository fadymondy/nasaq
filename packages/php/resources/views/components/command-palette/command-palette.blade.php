{{-- <x-nq::command-palette :commands="[['id' => 'new', 'label' => 'New issue', 'section' => 'create', 'icon' => 'plus', 'shortcut' => 'C'], ['id' => 'docs', 'label' => 'Open docs', 'section' => 'navigation', 'href' => '/docs']]" />
     Spotlight search (Raycast, Linear Cmd+K): a dialog with a field and a ranked, grouped list. Cmd+K or Ctrl+K opens it; arrows, Home, End and Enter drive the list; Escape closes.
     commands: id, label, section (context | search | create | navigation | products | ai | system, or your own with section-label and section-order), icon (a lucide name), keywords (synonyms, the other language's name),
     shortcut (shown as keys: "Mod K", "G I"; not bound), hint (muted text at the inline end), priority, disabled, search-only (listed only once the user types), keep-open, href (followed when chosen),
     children (a nested page of commands; Backspace on an empty field and Escape go back).
     Choosing a command fires a bubbling, cancelable "nq-command" { id, command } from the root, then follows href unless it was cancelled. "nq-open-change" { open } on open and close.
     sources: async results from your own JSON endpoint: [['url' => '/search', 'param' => 'q', 'minQuery' => 2, 'debounce' => 150]]; it returns a list of commands (use icon-html for icons).
     open: start open (x-modelable: x-model="$wire.paletteOpen"); window events "nq-command-palette-open" and "nq-command-palette-toggle" open or toggle it. hotkey: false turns Cmd+K off.
     section-labels: ['navigation' => 'Jump to']. placeholder, empty-label, labels: ['title','navigate','select','close','back','searching','filter'].
     Not ported: a shared commands registry (pass commands as props) and per-command shortcut binding. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['commands' => [], 'sources' => [], 'sectionLabels' => [], 'open' => false, 'hotkey' => true, 'placeholder' => null, 'emptyLabel' => null, 'labels' => []])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $draw = function (array $list) use (&$draw) {
        return collect($list)->map(function ($c) use (&$draw) {
            if (! empty($c['icon']) && empty($c['iconHtml'])) {
                $c['iconHtml'] = \Illuminate\Support\Facades\Blade::render('<x-dynamic-component :component="$name" aria-hidden="true" />', ['name' => 'lucide-'.$c['icon']]);
            }
            unset($c['icon']);
            if (! empty($c['children'])) {
                $c['children'] = $draw($c['children']);
            }
            return $c;
        })->values()->all();
    };
    $rows = $draw($commands);
    $options = array_filter([
        'hotkey' => $hotkey ? null : false,
        'sectionLabels' => $sectionLabels ?: null,
        'sources' => $sources ?: null,
        'open' => $open ?: null,
    ], fn ($v) => $v !== null);
    $t = fn (string $key, string $en, string $ar) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $ar);
    $title = $t('title', 'Command palette', 'لوحة الأوامر');
    $navigate = $t('navigate', 'Navigate', 'تنقّل');
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $placeholderText = $placeholder ?? \Nasaq\Nasaq::t('Search or run a command…', 'ابحث أو نفّذ أمرًا…');
    $filter = $t('filter', 'Filter…', 'تصفية…');
@endphp
<div data-slot="command-palette-root" x-data="nqCommandPalette({!! $js($rows) !!}, {!! $js((object) $options) !!})" x-modelable="open"
    x-on:keydown.window="onHotkey($event)" x-on:nq-command-palette-open.window="show()" x-on:nq-command-palette-toggle.window="toggle()" {{ $attributes->cn('contents') }}>
    <template x-teleport="body">
        <div data-slot="command-palette-portal">
            <div data-slot="command-palette-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/10 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div class="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh]">
                <div data-slot="command-palette" role="dialog" aria-modal="true" aria-label="{{ $title }}" tabindex="-1" x-nq-presence="open" x-trap.noscroll="open"
                    x-on:keydown.escape="onEscape($event)"
                    class="pointer-events-auto flex max-h-[min(32rem,76dvh)] w-full max-w-xl flex-col overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none {{ $fade }}">
                    <div class="flex items-center gap-2 border-b border-border px-4">
                        <x-lucide-loader-circle x-show="searching" aria-hidden="true" class="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
                        <x-lucide-search x-show="! searching" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                        <template x-for="(p, i) in pages" x-bind:key="p.id">
                            <button type="button" x-on:click="back(i)"
                                class="flex h-6 shrink-0 items-center gap-1 rounded-[4px] bg-nq-selected px-1.5 text-caption font-medium text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                                <span x-text="p.label"></span>
                                <x-lucide-chevron-right aria-hidden="true" class="size-3 text-muted-foreground rtl:-scale-x-100" />
                            </button>
                        </template>
                        <input type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="nq-cp-list" autocomplete="off" spellcheck="false"
                            x-model="query" x-on:keydown="onKey($event)"
                            x-bind:aria-activedescendant="view().flat.length ? optionId(highlighted) : null"
                            x-bind:placeholder="page() ? {!! $js($filter) !!} : {!! $js($placeholderText) !!}"
                            class="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]">
                        <button type="button" x-on:click="close()" class="shrink-0 rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <x-nq::text.kbd>Esc</x-nq::text.kbd>
                            <span class="sr-only">{{ $t('close', 'Close', 'إغلاق') }}</span>
                        </button>
                    </div>
                    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [scroll-padding-block:0.375rem]">
                        <div x-show="view().flat.length === 0" data-slot="command-palette-empty" class="flex min-h-24 items-center justify-center text-body-sm text-muted-foreground">
                            <span x-show="searching">{{ $t('searching', 'Searching…', 'جارٍ البحث…') }}</span>
                            <span x-show="! searching">{{ $emptyLabel ?? \Nasaq\Nasaq::t('No results', 'لا نتائج') }}</span>
                        </div>
                        <div id="nq-cp-list" role="listbox" aria-label="{{ $title }}">
                            <template x-for="section in view().sections" x-bind:key="section.id">
                                <div role="group" x-bind:aria-label="section.label" class="not-last:mb-1.5">
                                    <div x-text="section.label" x-bind:class="page() ? 'sr-only' : ''" class="px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground"></div>
                                    <template x-for="row in section.items" x-bind:key="row.c.id">
                                        <div role="option" data-slot="command-item" x-bind:id="optionId(row.i)" x-bind:data-id="row.c.id" x-bind:aria-selected="row.i === highlighted ? 'true' : 'false'"
                                            x-bind:aria-disabled="row.c.disabled ? 'true' : null" x-bind:data-highlighted="row.i === highlighted ? '' : null" x-bind:data-disabled="row.c.disabled ? '' : null"
                                            x-on:mousemove="highlighted = row.i" x-on:click="run(row.c)"
                                            class="group flex h-10 min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-3 rounded-control px-2.5 text-body-sm text-foreground outline-none [scroll-margin-block:0.375rem] data-highlighted:bg-nq-selected data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-highlighted:[&_svg]:text-foreground">
                                            <span x-show="row.c.iconHtml" x-html="row.c.iconHtml" class="contents"></span>
                                            <span x-text="row.c.label" class="min-w-0 flex-1 truncate"></span>
                                            <span x-show="row.c.hint" x-text="row.c.hint" class="shrink-0 text-caption text-muted-foreground"></span>
                                            <span x-show="row.c.shortcut" class="flex shrink-0 gap-0.5" dir="ltr">
                                                <template x-for="k in (row.c.shortcut ? keys(row.c.shortcut) : [])"><kbd data-slot="kbd" dir="ltr" x-text="k" class="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-card px-1 font-mono text-[11px] text-muted-foreground"></kbd></template>
                                            </span>
                                            <x-lucide-chevron-right x-show="row.c.children" aria-hidden="true" class="size-3.5! rtl:-scale-x-100" />
                                        </div>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 border-t border-border bg-nq-surface-soft px-4 py-2 text-caption text-muted-foreground">
                        <span class="flex items-center gap-1.5">
                            <x-nq::text.kbd>↑</x-nq::text.kbd>
                            <x-nq::text.kbd>↓</x-nq::text.kbd>
                            {{ $navigate }}
                        </span>
                        <span class="flex items-center gap-1.5">
                            <x-nq::text.kbd><x-lucide-corner-down-left class="size-3" aria-hidden="true" /></x-nq::text.kbd>
                            {{ $t('select', 'Open', 'فتح') }}
                        </span>
                        <span x-show="pages.length" class="flex items-center gap-1.5">
                            <x-nq::text.kbd>⌫</x-nq::text.kbd>
                            {{ $t('back', 'Back', 'رجوع') }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </template>
</div>

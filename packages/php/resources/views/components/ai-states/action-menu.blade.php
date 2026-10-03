{{-- <x-nq::ai-states.action-menu :actions="[['id' => 'summarize', 'label' => 'Summarize', 'recommended' => true, 'icon' => 'text', 'shortcut' => 'Mod Shift S'], ['id' => 'translate', 'label' => 'Translate']]" />
     The Cmd+J (Ctrl+J) menu: a dialog that searches the AI actions, the ones that fit the current context listed first under Recommended. Arrows move, Enter runs, Escape closes.
     actions: [{ id, label, description?, keywords? [..], recommended?, icon? (a Lucide name), shortcut? ("Mod Shift S", display only), disabled? }].
     open: start open (x-modelable: x-model="$wire.aiMenuOpen"); window events "nq-ai-menu-open" and "nq-ai-menu-toggle" open or toggle it. hotkey: false turns Cmd/Ctrl+J off. placeholder, labels (words: actionsTitle, actionsPlaceholder,
     recommended, allActions, noActions, navigate, run, close).
     Choosing an action closes the menu and fires a bubbling "nq-ai-action" { id } from the root; "nq-open-change" { open } on open and close. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.ai-states._logic')
@props(['actions' => [], 'open' => false, 'hotkey' => true, 'placeholder' => null, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $rows = collect($actions)->map(function ($a) {
        if (! empty($a['icon'])) {
            $a['iconHtml'] = \Illuminate\Support\Facades\Blade::render('<x-dynamic-component :component="$name" aria-hidden="true" />', ['name' => 'lucide-'.$a['icon']]);
        }
        unset($a['icon']);

        return $a;
    })->values()->all();
    $options = array_filter([
        'hotkey' => $hotkey ? null : false,
        'open' => $open ?: null,
        'words' => ['recommended' => $t['recommended'], 'allActions' => $t['allActions'], 'actionsTitle' => $t['actionsTitle']],
    ], fn ($v) => $v !== null);
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ai-action-menu-root') }}" x-data="nqAiActionMenu({!! $js($rows) !!}, {!! $js((object) $options) !!})" x-modelable="open"
    x-on:keydown.window="onHotkey($event)" x-on:nq-ai-menu-open.window="show()" x-on:nq-ai-menu-toggle.window="toggle()" {{ $attributes->except('data-slot')->cn('contents') }}>
    <template x-teleport="body">
        <div data-slot="ai-action-menu-portal">
            <div data-slot="ai-action-menu-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/10 dark:bg-nq-bg/60 {{ $fade }}"></div>
            <div class="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh]">
                <div data-slot="ai-action-menu" role="dialog" aria-modal="true" aria-label="{{ $t['actionsTitle'] }}" tabindex="-1" x-nq-presence="open" x-trap.noscroll="open" x-on:keydown.escape.stop="close()"
                    class="pointer-events-auto flex max-h-[min(30rem,76dvh)] w-full max-w-lg flex-col overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none {{ $fade }}">
                    <div class="flex items-center gap-2 border-b border-border px-4">
                        <x-lucide-sparkles aria-hidden="true" class="size-4 shrink-0 text-nq-accent-text" />
                        <input type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="nq-ai-list" aria-describedby="nq-ai-hint" autocomplete="off" spellcheck="false"
                            x-model="query" x-on:keydown="onKey($event)" x-bind:aria-activedescendant="view().flat.length ? optionId(highlighted) : null"
                            placeholder="{{ $placeholder ?? $t['actionsPlaceholder'] }}"
                            class="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]">
                        <button type="button" x-on:click="close()" class="shrink-0 rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <x-nq::text.kbd>Esc</x-nq::text.kbd>
                            <span class="sr-only">{{ $t['close'] }}</span>
                        </button>
                    </div>
                    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                        <div x-show="view().flat.length === 0" style="display: none" data-slot="ai-action-menu-empty" class="flex min-h-20 items-center justify-center text-body-sm text-muted-foreground">{{ $t['noActions'] }}</div>
                        <div id="nq-ai-list" role="listbox" aria-label="{{ $t['actionsTitle'] }}">
                            <template x-for="section in view().sections" x-bind:key="section.id">
                                <div role="group" x-bind:aria-label="section.label" class="not-last:mb-1.5">
                                    <div x-text="section.label" class="px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground"></div>
                                    <template x-for="row in section.items" x-bind:key="row.a.id">
                                        <div role="option" data-slot="ai-action-item" x-bind:id="optionId(row.i)" x-bind:data-id="row.a.id" x-bind:aria-selected="row.i === highlighted ? 'true' : 'false'"
                                            x-bind:aria-disabled="row.a.disabled ? 'true' : null" x-bind:data-highlighted="row.i === highlighted ? '' : null" x-bind:data-disabled="row.a.disabled ? '' : null"
                                            x-on:mousemove="highlighted = row.i" x-on:click="run(row.a)"
                                            class="flex min-h-10 cursor-default select-none items-center gap-3 rounded-control px-2.5 py-1.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
                                            <span x-show="row.a.iconHtml" x-html="row.a.iconHtml" class="contents"></span>
                                            <x-lucide-sparkles x-show="! row.a.iconHtml" aria-hidden="true" />
                                            <span class="flex min-w-0 flex-1 flex-col">
                                                <span x-text="row.a.label" dir="auto" class="truncate"></span>
                                                <span x-show="row.a.description" x-text="row.a.description" dir="auto" class="truncate text-caption text-muted-foreground"></span>
                                            </span>
                                            <span x-show="row.a.shortcut" dir="ltr" class="inline-flex gap-0.5">
                                                <template x-for="k in (row.a.shortcut ? keys(row.a.shortcut) : [])"><kbd data-slot="kbd" dir="ltr" x-text="k" class="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-card px-1 font-mono text-[11px] text-muted-foreground"></kbd></template>
                                            </span>
                                        </div>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </div>
                    <div id="nq-ai-hint" class="flex items-center gap-4 border-t border-border bg-nq-surface-soft px-4 py-2 text-caption text-muted-foreground">
                        <span class="flex items-center gap-1.5">
                            <x-nq::text.kbd>↑</x-nq::text.kbd>
                            <x-nq::text.kbd>↓</x-nq::text.kbd>
                            {{ $t['navigate'] }}
                        </span>
                        <span class="flex items-center gap-1.5">
                            <x-nq::text.kbd><x-lucide-corner-down-left class="size-3" aria-hidden="true" /></x-nq::text.kbd>
                            {{ $t['run'] }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </template>
</div>

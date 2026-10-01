{{-- <x-nq::quick-capture :suggested-tags="['idea', 'todo']" on-capture="fetch('/inbox', { method: 'POST', body: JSON.stringify(capture) })" />
     A shortcut (default Mod+Shift+K: Cmd on Apple, Ctrl elsewhere) opens a small dialog with a focused text box; Ctrl/Cmd+Enter saves, Escape closes.
     presentation: dialog (default) | panel (the bare form for a popup or side panel; it clears after a save).
     shortcut: a spec with a modifier, or :shortcut="null" for none. shortcut-enabled, show-hints (default true), open (start open; x-model / wire:model work).
     page: ['title' => ..., 'url' => ..., 'selection' => ...] turns it into the web clipper; the capture becomes a "clip".
     destinations: [['id' => 'inbox', 'label' => 'Inbox'], ...] (a picker for two or more), default-destination-id, suggested-tags, initial-text, placeholder.
     on-capture: a JS expression of (capture) that saves it; return { error: '...' } (or throw) to keep the text. A bubbling "capture" event carries the same value: @capture="save($event.detail)".
     capture = { kind: note | link | clip, text, title, url?, pageTitle?, selection?, tags, destinationId?, capturedAt }.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'presentation' => 'dialog', 'shortcut' => 'Mod+Shift+K', 'shortcutEnabled' => true, 'showHints' => true, 'open' => false,
    'page' => null, 'destinations' => [], 'defaultDestinationId' => null, 'suggestedTags' => [], 'initialText' => '', 'placeholder' => null, 'onCapture' => null,
])
@php
    $isDialog = $presentation === 'dialog';
    $options = array_filter([
        'presentation' => $presentation,
        'shortcut' => $shortcut,
        'shortcutEnabled' => $shortcutEnabled ? null : false,
        'page' => $page ?: null,
        'destinations' => array_values((array) $destinations),
        'defaultDestinationId' => $defaultDestinationId,
        'suggestedTags' => array_values((array) $suggestedTags),
        'initialText' => $initialText ?: null,
        'open' => $open ?: null,
    ], fn ($v) => $v !== null && $v !== []);
    // A null shortcut means "no shortcut" and must survive the filter above.
    if ($shortcut === null) {
        $options['shortcut'] = null;
    }
    $optionsJs = \Illuminate\Support\Js::from((object) $options)->toHtml();
    if ($onCapture) {
        $optionsJs = 'Object.assign('.$optionsJs.', { onCapture: (capture) => ('.$onCapture.') })';
    }
    $formProps = ['dialog' => $isDialog, 'page' => $page, 'destinations' => $destinations, 'suggestedTags' => $suggestedTags, 'placeholder' => $placeholder, 'showHints' => $showHints];
@endphp
@if ($isDialog)
    <div x-data="nqQuickCapture({!! $optionsJs !!})" x-modelable="open" x-id="['nq-qc']" class="contents">
        <template x-teleport="body">
            <div data-slot="quick-capture-portal">
                <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0"></div>
                <div data-slot="quick-capture" data-presentation="dialog" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
                    {{ $attributes->cn([
                        'fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg gap-4',
                        'rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none',
                        'max-h-[calc(100dvh-2rem)] overflow-y-auto',
                        'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
                        'max-w-xl',
                    ]) }}>
                    <x-nq::quick-capture.form :dialog="true" :page="$page" :destinations="$destinations" :suggested-tags="$suggestedTags" :placeholder="$placeholder" :show-hints="$showHints" />
                    <button type="button" data-slot="dialog-close" x-on:click="close()" aria-label="{{ \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                        class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
                </div>
            </div>
        </template>
    </div>
@else
    <div data-slot="quick-capture" data-presentation="panel" x-data="nqQuickCapture({!! $optionsJs !!})" x-id="['nq-qc']"
        {{ $attributes->cn('flex min-w-0 flex-col gap-4 rounded-floating border border-border bg-popover p-4 text-popover-foreground') }}>
        <x-nq::quick-capture.form :dialog="false" :page="$page" :destinations="$destinations" :suggested-tags="$suggestedTags" :placeholder="$placeholder" :show-hints="$showHints" />
    </div>
@endif

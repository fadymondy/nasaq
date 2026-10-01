{{-- <x-nq::keyboard-shortcuts.dialog :groups="$groups" />   press ? anywhere
     The shortcuts reference in a dialog, opened with the ? key from anywhere outside a text field, select or editable region.
     Takes the reference props (groups, platform, show-platform-switch, searchable, description, locale, labels).
     open: start open. The state is `shown` and x-modelable: x-model="shown" and wire:model work. hotkey: the key that toggles it (default "?", :hotkey="null" turns it off).
     Teleported to <body>, focus-trapped, closes on Escape and backdrop click. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['groups' => [], 'open' => false, 'hotkey' => '?', 'platform' => 'auto', 'showPlatformSwitch' => true, 'searchable' => true, 'description' => null, 'locale' => null, 'labels' => []])
@php
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $t = array_merge($ar
        ? ['title' => 'اختصارات لوحة المفاتيح', 'description' => 'اضغط هذه المفاتيح من أي مكان في التطبيق.', 'close' => 'إغلاق']
        : ['title' => 'Keyboard shortcuts', 'description' => 'Press these keys anywhere in the app.', 'close' => 'Close'], (array) $labels);
    $fade = 'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $panel = \Nasaq\Cn::merge(
        'fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg gap-4 rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto',
        $fade,
        'max-h-[85dvh] w-[min(56rem,calc(100vw-2rem))] max-w-none overflow-y-auto',
    );
@endphp
<div data-slot="shortcuts-dialog-root" x-data="nqShortcutsDialog(@js((bool) $open), @js($hotkey))" x-modelable="shown" x-on:keydown.window="onKey($event)" {{ $attributes->cn('contents') }}>
    <x-nq::dialog x-model="shown">
        <template x-teleport="body">
            <div data-slot="dialog-portal">
                <div data-slot="dialog-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60 {{ $fade }}"></div>
                <div data-slot="shortcuts-dialog" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open" class="{{ $panel }}">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title class="text-title">{{ $t['title'] }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t['description'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::keyboard-shortcuts :groups="$groups" :platform="$platform" :show-platform-switch="$showPlatformSwitch" :searchable="$searchable" :title="false" :description="$description" :locale="$locale" :labels="$labels" />
                    <button type="button" data-slot="dialog-close" x-on:click="close()" aria-label="{{ $t['close'] }}"
                        class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
                </div>
            </div>
        </template>
    </x-nq::dialog>
</div>

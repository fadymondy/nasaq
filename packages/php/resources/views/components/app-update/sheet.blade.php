{{-- <x-nq::app-update.sheet x-model="showUpdate" :release="['version' => '2.4.0', 'build' => 240, 'size' => 48200000, 'notes' => [['type' => 'new', 'text' => 'Offline mode']]]" status="available" />
     The update details in a side sheet: release notes, size, the download with speed and time left, then Restart or Later. It never downloads or restarts by itself.
     Open it with x-model (or wire:model) on a boolean; it is x-modelable. open starts it open.
     release: version, build, date, notes ([type: new|improved|fixed, text]), size (bytes), channel (stable|beta). status: available | downloading | ready | error. progress 0..100, speed bytes per second.
     side: end (default) | start | bottom. labels: array overriding the words.
     Events (bubbling, from the root): nq-update-download (the Download / Try again button), nq-update-restart (Restart now), nq-update-later (Later; the sheet then closes).
     Drive the live state with window.dispatchEvent(new CustomEvent('nq-update-state', { detail: { status, progress, speed } })).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.app-update._words')
@props(['open' => false, 'release', 'status' => 'available', 'progress' => 0, 'speed' => null, 'side' => 'end', 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_au_words($locale, $labels);
    $status = in_array($status, ['available', 'downloading', 'ready', 'error'], true) ? $status : 'available';
    $sides = [
        'end' => [
            'inset-y-0 end-0 h-dvh w-[min(24rem,100vw)] border-s border-border',
            'data-starting-style:translate-x-8 data-ending-style:translate-x-8',
            'rtl:data-starting-style:-translate-x-8 rtl:data-ending-style:-translate-x-8',
        ],
        'start' => [
            'inset-y-0 start-0 h-dvh w-[min(24rem,100vw)] border-e border-border',
            'data-starting-style:-translate-x-8 data-ending-style:-translate-x-8',
            'rtl:data-starting-style:translate-x-8 rtl:data-ending-style:translate-x-8',
        ],
        'bottom' => [
            'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-floating border-t border-border',
            'data-starting-style:translate-y-8 data-ending-style:translate-y-8',
        ],
    ];
    $side = isset($sides[$side]) ? $side : 'end';
    $size = $release['size'] ?? null;
    $id = 'nq-au-'.substr(md5(json_encode([$release['version'] ?? '', $locale])), 0, 8);
    $config = ['open' => (bool) $open, 'status' => $status, 'progress' => $progress, 'speed' => $speed, 'size' => $size, 'locale' => $locale, 't' => array_intersect_key($t, array_flip(['retry', 'download', 'remaining']))];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'sheet') }}" x-data="nqAppUpdateSheet(@js($config))" x-modelable="open" x-id="['nq-dialog']" x-on:nq-update-state.window="set($event.detail)"
    {{ $attributes->except('data-slot')->cn('contents') }}>
    <template x-teleport="body">
        <div data-slot="sheet-portal">
            <div data-slot="sheet-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60"></div>
            <div data-slot="update-sheet" data-side="{{ $side }}" data-status="{{ $status }}" x-bind:data-status="status" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
                class="{{ \Nasaq\Cn::merge(
                    'fixed z-50 flex flex-col bg-popover text-popover-foreground outline-none shadow-floating',
                    'transition-[translate,opacity] duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
                    ...$sides[$side],
                ) }}">
                <x-nq::sheet.header>
                    <x-nq::sheet.title class="text-h3">{{ nq_au_fill($t['sheetTitle'], ['version' => $release['version']]) }}</x-nq::sheet.title>
                    <x-nq::sheet.description class="flex flex-wrap items-center gap-2">
                        <span>{{ nq_au_fill($t['sheetDescription'], ['build' => $release['build']]) }}</span>
                        @if (isset($release['date']))
                            <x-nq::numeric.date-time :value="$release['date']" date-style="medium" :locale="$locale" />
                        @endif
                        @if (($release['channel'] ?? null) === 'beta')
                            <x-nq::badge variant="warning">{{ $t['beta'] }}</x-nq::badge>
                        @endif
                    </x-nq::sheet.description>
                </x-nq::sheet.header>
                <x-nq::sheet.body class="flex flex-col gap-5 p-4">
                    @include('nasaq::components.app-update._notes', ['notes' => $release['notes'] ?? [], 't' => $t, 'id' => $id.'-notes'])
                    @if ($size)
                        <p class="flex items-center justify-between text-body-sm">
                            <span class="text-muted-foreground">{{ $t['size'] }}</span>
                            <span dir="ltr" class="tabular-nums">{{ nq_au_size($size, $locale) }}</span>
                        </p>
                    @endif
                    @include('nasaq::components.app-update._progress', ['t' => $t, 'status' => $status, 'progress' => $progress, 'id' => $id])
                    <x-nq::alert tone="success" icon="circle-check" x-show="status === 'ready'" :style="$status !== 'ready' ? 'display: none' : null">{{ $t['readyNote'] }}</x-nq::alert>
                    <x-nq::alert tone="danger" x-show="status === 'error'" :style="$status !== 'error' ? 'display: none' : null">{{ $t['errorNote'] }}</x-nq::alert>
                </x-nq::sheet.body>
                <x-nq::sheet.footer class="justify-end">
                    <x-nq::button variant="ghost" x-on:click="later()">{{ $t['later'] }}</x-nq::button>
                    <x-nq::button variant="primary" x-show="status === 'ready'" x-on:click="restart()" :style="$status !== 'ready' ? 'display: none' : null">
                        <x-lucide-rotate-cw aria-hidden="true" />{{ $t['restart'] }}
                    </x-nq::button>
                    <x-nq::button variant="primary" x-show="status !== 'ready'" x-on:click="download()" :style="$status === 'ready' ? 'display: none' : null"
                        x-bind:disabled="status === 'downloading'" x-bind:data-disabled="status === 'downloading' ? '' : null" x-bind:aria-busy="status === 'downloading' ? 'true' : null" :disabled="$status === 'downloading'">
                        <x-nq::spinner x-show="status === 'downloading'" :style="$status !== 'downloading' ? 'display: none' : null" />
                        <span x-text="status === 'error' ? t.retry : t.download">{{ $status === 'error' ? $t['retry'] : $t['download'] }}</span>
                    </x-nq::button>
                </x-nq::sheet.footer>
                <button type="button" data-slot="sheet-close" x-on:click="close()" aria-label="{{ \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                    class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
            </div>
        </div>
    </template>
</div>

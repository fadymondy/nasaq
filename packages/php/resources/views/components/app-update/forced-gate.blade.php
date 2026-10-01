{{-- <x-nq::app-update.forced-gate :current-build="$build" :min-supported-build="$min" :release="$release" status="available"> the app </x-nq::app-update.forced-gate>
     Wraps the app. While the running build is at or above min-supported-build it renders the slot. Below it, it renders a full screen with no way to dismiss: the only path is to download and restart.
     current-build: the build running now. min-supported-build: the oldest build the server still supports (null: never block). release: version, build, date, notes, size, channel (see app-update.sheet).
     status: available | downloading | ready | error. progress 0..100, speed bytes per second. <x-slot:logo> replaces the provider brand logo. labels: array overriding the words.
     Events (bubbling): nq-update-download, nq-update-restart. Live state: window.dispatchEvent(new CustomEvent('nq-update-state', { detail: { status, progress, speed } })).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.app-update._words')
@props(['currentBuild', 'minSupportedBuild' => null, 'release', 'status' => 'available', 'progress' => 0, 'speed' => null, 'logo' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $required = $minSupportedBuild !== null && $currentBuild < $minSupportedBuild;
    $t = nq_au_words($locale, $labels);
    $status = in_array($status, ['available', 'downloading', 'ready', 'error'], true) ? $status : 'available';
    $size = $release['size'] ?? null;
    $id = 'nq-au-'.substr(md5(json_encode([$release['version'] ?? '', $locale])), 0, 8);
    $config = ['status' => $status, 'progress' => $progress, 'speed' => $speed, 'size' => $size, 'locale' => $locale, 't' => array_intersect_key($t, array_flip(['retry', 'download', 'remaining']))];
    $hasLogo = isset($logo) && $logo instanceof \Illuminate\View\ComponentSlot && ! $logo->isEmpty();
@endphp
@if (! $required)
    {{ $slot }}
@else
    <main data-slot="forced-update-gate" data-status="{{ $status }}" x-data="nqAppUpdate(@js($config))" x-on:nq-update-state.window="set($event.detail)" x-bind:data-status="status"
        {{ $attributes->cn('flex min-h-dvh flex-col items-center justify-center gap-8 bg-background p-6 text-center text-foreground') }}>
        @if ($hasLogo)
            {{ $logo }}
        @else
            <x-nq::product-mark.logo :size="24" />
        @endif
        <div class="flex w-full max-w-md flex-col items-center gap-5">
            <span aria-hidden="true" class="inline-flex size-12 items-center justify-center rounded-card border border-border bg-card text-nq-warning-text">
                <x-lucide-sparkles class="size-6" />
            </span>
            <div class="flex flex-col gap-2">
                <h1 class="text-h2">{{ $t['forcedTitle'] }}</h1>
                <p class="text-body text-muted-foreground">{{ $t['forcedBody'] }}</p>
                <p class="text-caption text-muted-foreground">{{ nq_au_fill($t['forcedVersions'], ['current' => $currentBuild, 'min' => $minSupportedBuild]) }}</p>
            </div>
            <div class="w-full rounded-card border border-border bg-card p-4 text-start">
                <div class="mb-3 flex items-center justify-between gap-2">
                    <span class="text-label">{{ nq_au_fill($t['sheetTitle'], ['version' => $release['version']]) }}</span>
                    @if ($size)
                        <span dir="ltr" class="text-caption text-muted-foreground tabular-nums">{{ nq_au_size($size, $locale) }}</span>
                    @endif
                </div>
                @include('nasaq::components.app-update._notes', ['notes' => array_slice($release['notes'] ?? [], 0, 3), 't' => $t, 'id' => $id.'-notes'])
                @include('nasaq::components.app-update._progress', ['t' => $t, 'status' => $status, 'progress' => $progress, 'id' => $id])
                <x-nq::alert tone="danger" class="mt-3" x-show="status === 'error'" :style="$status !== 'error' ? 'display: none' : null">{{ $t['errorNote'] }}</x-nq::alert>
            </div>
            <x-nq::button variant="primary" size="lg" x-show="status === 'ready'" x-on:click="restart()" :style="$status !== 'ready' ? 'display: none' : null">
                <x-lucide-rotate-cw aria-hidden="true" />{{ $t['restart'] }}
            </x-nq::button>
            <x-nq::button variant="primary" size="lg" x-show="status !== 'ready'" x-on:click="download()" :style="$status === 'ready' ? 'display: none' : null"
                x-bind:disabled="status === 'downloading'" x-bind:data-disabled="status === 'downloading' ? '' : null" x-bind:aria-busy="status === 'downloading' ? 'true' : null" :disabled="$status === 'downloading'">
                <x-nq::spinner x-show="status === 'downloading'" :style="$status !== 'downloading' ? 'display: none' : null" />
                <span x-text="status === 'error' ? t.retry : t.download">{{ $status === 'error' ? $t['retry'] : $t['download'] }}</span>
            </x-nq::button>
        </div>
    </main>
@endif

{{-- <x-nq::app-update status="downloading" :progress="42" version="2.4.0" @click="$dispatch('nq-open-update')" />
     The update pill for a title bar or header: "Update available", the download as it runs, "Restart to update", "Update failed". It is the button; give it your own @click.
     status: available (default) | downloading | ready | error. progress: 0..100 while downloading. version: shown as the hint (title). labels: array overriding the words.
     Keep it live from JS: window.dispatchEvent(new CustomEvent('nq-update-state', { detail: { status: 'downloading', progress: 42 } })); every pill, sheet and gate on the page follows.
     Parts: app-update.sheet, app-update.forced-gate, app-update.release-manager. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.app-update._words')
@props(['status' => 'available', 'progress' => 0, 'version' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_au_words($locale, $labels);
    $status = in_array($status, ['available', 'downloading', 'ready', 'error'], true) ? $status : 'available';
    $percent = (int) round(nq_au_percent($progress));
    $text = [
        'available' => $t['pillAvailable'],
        'downloading' => nq_au_fill($t['pillDownloading'], ['percent' => $percent]),
        'ready' => $t['pillReady'],
        'error' => $t['pillError'],
    ][$status];
    $tone = [
        'ready' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        'error' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'plain' => 'border-border bg-card text-foreground hover:bg-nq-hover',
    ];
    $now = $status === 'ready' ? 'ready' : ($status === 'error' ? 'error' : 'plain');
    $config = ['status' => $status, 'progress' => $progress, 'locale' => $locale, 't' => array_intersect_key($t, array_flip(['pillAvailable', 'pillDownloading', 'pillReady', 'pillError']))];
@endphp
<button type="button" data-slot="{{ $attributes->get('data-slot', 'update-pill') }}" data-status="{{ $status }}" @if ($version) title="{{ nq_au_fill($t['pillHint'], ['version' => $version]) }}" @endif
    x-data="nqAppUpdate(@js($config))" x-on:nq-update-state.window="set($event.detail)" x-bind:data-status="status"
    x-bind:class="{ '{{ $tone['ready'] }}': status === 'ready', '{{ $tone['error'] }}': status === 'error', '{{ $tone['plain'] }}': status === 'available' || status === 'downloading' }"
    {{ $attributes->except('data-slot')->cn([
        'relative inline-flex h-control-sm items-center gap-1.5 overflow-hidden rounded-full border px-3 text-label outline-none focus-visible:outline-2 focus-visible:outline-nq-focus',
        $tone[$now],
    ]) }}>
    <span aria-hidden="true" data-slot="update-pill-fill" x-show="status === 'downloading'" x-bind:style="{ inlineSize: percent() + '%' }"
        style="inline-size: {{ $percent }}%;{{ $status === 'downloading' ? '' : ' display: none' }}"
        class="absolute inset-y-0 start-0 bg-primary/15 transition-[inline-size] duration-300 ease-nq motion-reduce:transition-none"></span>
    <x-lucide-arrow-down-to-line aria-hidden="true" class="relative size-3.5" x-show="status === 'available'" style="{{ $status !== 'available' ? 'display: none' : '' }}" />
    <x-lucide-refresh-cw aria-hidden="true" class="relative size-3.5 motion-safe:animate-spin" x-show="status === 'downloading'" style="{{ $status !== 'downloading' ? 'display: none' : '' }}" />
    <x-lucide-circle-check aria-hidden="true" class="relative size-3.5" x-show="status === 'ready'" style="{{ $status !== 'ready' ? 'display: none' : '' }}" />
    <x-lucide-circle-alert aria-hidden="true" class="relative size-3.5" x-show="status === 'error'" style="{{ $status !== 'error' ? 'display: none' : '' }}" />
    <span class="relative" aria-live="polite" x-text="pillText()">{{ $text }}</span>
</button>

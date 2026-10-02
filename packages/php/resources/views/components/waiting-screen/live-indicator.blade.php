{{-- <x-nq::waiting-screen.live-indicator connection="live" :updated-at="$ms" />
     A small "Live" dot with the connection state in words and, when given, how old the data is. Never colour alone.
     connection: live | reconnecting | offline. updated-at: epoch ms of the last data; the age ticks every second (needs the Alpine runtime).
     now: epoch ms that freezes the clock. labels: array overriding the words. --}}
@include('nasaq::components.waiting-screen._logic')
@props(['connection' => 'live', 'updatedAt' => null, 'now' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ws_words($locale, $labels);
    $connection = in_array($connection, ['live', 'reconnecting', 'offline'], true) ? $connection : 'live';
    $text = $t[$connection === 'live' ? 'live' : ($connection === 'reconnecting' ? 'reconnecting' : 'offline')];
    $clock = $now ?? nq_ws_now();
    $seconds = $updatedAt === null ? null : max(0, (int) round(($clock - $updatedAt) / 1000));
    $dot = $connection === 'live' ? 'bg-nq-success-text' : 'bg-nq-warning-text';
    $cfg = ['updatedAt' => $updatedAt, 'frozen' => $now !== null, 'serverNow' => $clock, 'justNow' => $t['updatedNow'], 'ago' => $t['updated']];
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'queue-live') }}" data-connection="{{ $connection }}" role="status" aria-label="{{ $t['connection'] }}: {{ $text }}" @if ($updatedAt !== null && $now === null) x-data="nqQueueLive(@js($cfg))" @endif
    {{ $attributes->except('data-slot')->cn('inline-flex items-center gap-1.5 text-caption text-muted-foreground') }}>
    @if ($connection === 'offline')
        <x-lucide-wifi-off aria-hidden="true" class="size-3.5 text-nq-danger-text" />
    @else
        <span aria-hidden="true" class="relative flex size-2">
            <span class="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping {{ $dot }}"></span>
            <span class="relative inline-flex size-2 rounded-full {{ $dot }}"></span>
        </span>
    @endif
    <span class="font-medium text-foreground">{{ $text }}</span>
    @if ($seconds !== null)
        <span>· <span data-slot="queue-updated" @if ($now === null) x-text="text" @endif>{{ $seconds < 5 ? $t['updatedNow'] : nq_ws_fill($t['updated'], $seconds) }}</span></span>
    @endif
</span>

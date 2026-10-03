{{-- <x-nq::marketing-sections.session-playback title="Booking assistant" :events="[['role' => 'user', 'text' => 'Summarise yesterday'], ['role' => 'tool', 'title' => 'Read bookings', 'text' => '42 rows'], ['role' => 'assistant', 'text' => 'You had 42 bookings.']]" />
     A scripted AI session that plays back like a recording: messages type out word by word, tool steps appear as they run, with a play/pause button and a scrubber. A marketing demo, not a live chat (use chat or copilot-chat).
     Arabic text reveals whole words, never letters. The server renders the whole session (readable without JavaScript); the Alpine runtime then replays it, and under prefers-reduced-motion leaves it whole and does not autoplay.
     events: [['role' => user | assistant | tool | status, 'text', 'title' (a tool's name), 'delay' (ms of extra pause before it)]]. title: header text. auto-play: start when scrolled into view (true).
     loop: start again after the end (false). timing: ['wordMs' => 90, 'gapMs' => 500, 'holdMs' => 900]. names: ['user' => , 'assistant' => ]. height: transcript height (22rem).
     labels: ['play', 'pause', 'restart', 'position', 'transcript']. lang: language of the script text, for word splitting (the page language). Fires `nq-session-end` on the figure when the script finishes. --}}
@props(['events' => [], 'title' => null, 'autoPlay' => true, 'loop' => false, 'timing' => [], 'names' => [], 'height' => '22rem', 'labels' => [], 'lang' => null])
@php
    $locale = app()->getLocale();
    $ar = str_starts_with(strtolower($locale), 'ar');
    $strings = $ar
        ? ['play' => 'تشغيل', 'pause' => 'إيقاف مؤقت', 'restart' => 'إعادة التشغيل', 'position' => 'موضع التشغيل', 'transcript' => 'جلسة الذكاء الاصطناعي']
        : ['play' => 'Play', 'pause' => 'Pause', 'restart' => 'Replay', 'position' => 'Playback position', 'transcript' => 'AI session'];
    $t = array_merge($strings, array_filter((array) $labels, fn ($v) => $v !== null));
    $you = $names['user'] ?? ($ar ? 'أنت' : 'You');
    $ai = $names['assistant'] ?? ($ar ? 'المساعد' : 'Assistant');
    $events = array_values($events);
    // The length of the whole script (the same maths as the Alpine runtime), so the clock reads right before Alpine starts.
    $wordMs = $timing['wordMs'] ?? 90;
    $gapMs = $timing['gapMs'] ?? 500;
    $holdMs = $timing['holdMs'] ?? 900;
    $clock = 0;
    foreach ($events as $i => $e) {
        $typed = in_array($e['role'] ?? 'assistant', ['user', 'assistant'], true);
        $words = $typed ? count(preg_split('/\s+/u', trim((string) ($e['text'] ?? '')), -1, PREG_SPLIT_NO_EMPTY) ?: []) : 1;
        $clock += ($i === 0 ? 0 : $gapMs) + ($e['delay'] ?? 0) + ($typed ? $words * $wordMs : $holdMs);
    }
    $stamp = fn (int|float $ms): string => intdiv((int) floor($ms / 1000), 60).':'.str_pad((string) ((int) floor($ms / 1000) % 60), 2, '0', STR_PAD_LEFT);
    $config = [
        'events' => array_map(fn ($e) => ['role' => $e['role'] ?? 'assistant', 'text' => (string) ($e['text'] ?? ''), 'title' => $e['title'] ?? null, 'delay' => $e['delay'] ?? 0], $events),
        'autoPlay' => (bool) $autoPlay,
        'loop' => (bool) $loop,
        'timing' => (object) $timing,
        'lang' => $lang ?? ($ar ? 'ar' : 'en'),
        'labels' => ['play' => $t['play'], 'pause' => $t['pause'], 'restart' => $t['restart']],
    ];
@endphp
<figure data-slot="{{ $attributes->get('data-slot', 'session-playback') }}" x-data="nqSessionPlayback({{ \Illuminate\Support\Js::from($config) }})"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card') }}>
    <figcaption class="flex items-center gap-2 border-border border-b bg-nq-surface-soft px-3 py-2 text-caption text-muted-foreground">
        <x-lucide-sparkles aria-hidden="true" class="size-3.5 text-nq-brand" />
        <span class="min-w-0 flex-1 truncate">{{ $title ?? $t['transcript'] }}</span>
    </figcaption>
    <div data-log x-ref="log" role="log" aria-label="{{ $t['transcript'] }}" class="flex flex-col gap-3 overflow-y-auto p-4" style="height: {{ $height }}">
        @foreach ($events as $i => $event)
            @php($role = $event['role'] ?? 'assistant')
            @if ($role === 'tool' || $role === 'status')
                <div data-event="{{ $i }}" class="flex min-w-0 items-center gap-2 rounded-control border border-border bg-nq-surface-soft px-2.5 py-1.5 text-caption text-muted-foreground">
                    <x-lucide-wrench aria-hidden="true" class="size-3.5 shrink-0" />
                    @if (! empty($event['title']))<span class="font-medium text-foreground">{{ $event['title'] }}</span>@endif
                    <span dir="auto" class="min-w-0 truncate">{{ $event['text'] ?? '' }}</span>
                </div>
            @else
                @php($mine = $role === 'user')
                <div data-event="{{ $i }}" class="{{ $mine ? 'flex min-w-0 flex-col gap-1 items-end' : 'flex min-w-0 flex-col gap-1 items-start' }}">
                    <span class="text-caption text-muted-foreground">{{ $mine ? $you : $ai }}</span>
                    <p dir="auto" class="{{ \Nasaq\Cn::merge('max-w-[85%] rounded-card px-3 py-2 text-body-sm text-start', $mine ? 'bg-nq-selected text-foreground' : 'bg-secondary text-nq-fg-body') }}"><span data-text>{{ $event['text'] ?? '' }}</span><span data-cursor hidden aria-hidden="true" class="ms-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground"></span></p>
                </div>
            @endif
        @endforeach
    </div>
    <div class="flex items-center gap-3 border-border border-t px-3 py-2">
        <x-nq::button variant="ghost" size="icon-sm" x-on:click="toggle()" x-bind:aria-label="playLabel()">
            <x-lucide-rotate-ccw aria-hidden="true" class="rtl:-scale-x-100" x-show="mode() === `restart`" />
            <x-lucide-pause aria-hidden="true" style="display: none" x-show="mode() === `pause`" />
            <x-lucide-play aria-hidden="true" style="display: none" class="rtl:-scale-x-100" x-show="mode() === `play`" />
        </x-nq::button>
        <x-nq::slider aria-label="{{ $t['position'] }}" class="min-w-0 flex-1" :min="0" :max="100" :step="1" :value="100" :show-value="false" x-model="pct" />
        <span dir="ltr" class="w-20 shrink-0 text-end text-caption text-muted-foreground tabular-nums" x-text="clock()">{{ $stamp($clock) }} / {{ $stamp($clock) }}</span>
    </div>
</figure>

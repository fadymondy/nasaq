{{-- <x-nq::lobby-display :entries="$queue" :rooms="['1', '2', '3']" clinic="Nasaq Clinic" />
     A big-screen board for a waiting room: one card per room with the ticket it is calling, the next tickets in line, recent calls and a clock.
     Shows ticket numbers only, never names. A call that appears after the first render flashes for highlight-ms, is announced to screen readers
     and plays a chime when the operator has turned sound on (browsers need one click first). Re-render the board (Livewire poll, htmx, a refresh)
     to bring new calls; the Alpine part notices them. Sizes scale with the board's own width.
     entries: arrays of ['id', 'ticket', 'number', 'status' (waiting|called|serving|done|skipped|no_show|left), 'priority', 'queuedAt', 'calledAt', 'room'].
     rooms: names in board order. connection (live|reconnecting|offline) and updated-at feed the live indicator. highlight-ms: 10000. up-next: 5.
     sound: start with sound on (false). now: epoch ms that freezes the clock. labels: array overriding any built-in word.
     Fires a bubbling "nq-lobby-sound" { on } when the operator toggles the sound. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.waiting-screen._logic')
@props(['entries' => [], 'rooms' => [], 'clinic' => null, 'connection' => 'live', 'updatedAt' => null, 'highlightMs' => 10000, 'upNext' => 5, 'sound' => false, 'now' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $en = [
        'nowServing' => 'Now serving', 'room' => 'Room :n', 'free' => 'Available', 'called' => 'Please come in', 'inVisit' => 'In visit',
        'recent' => 'Recently called', 'upNext' => 'Up next', 'waiting' => 'Waiting', 'none' => 'No calls yet.', 'nobodyWaiting' => 'Nobody is waiting.',
        'soundOn' => 'Sound on', 'soundOff' => 'Turn sound on', 'announce' => 'Ticket :t, please go to :r.', 'announceDesk' => 'Ticket :t, please come to the desk.',
        'board' => 'Queue board', 'more' => '+:n more',
    ];
    $arabic = [
        'nowServing' => 'يُخدم الآن', 'room' => 'الغرفة :n', 'free' => 'متاحة', 'called' => 'تفضّل بالدخول', 'inVisit' => 'في الزيارة',
        'recent' => 'آخر النداءات', 'upNext' => 'التالي', 'waiting' => 'في الانتظار', 'none' => 'لا نداءات بعد.', 'nobodyWaiting' => 'لا أحد في الانتظار.',
        'soundOn' => 'الصوت يعمل', 'soundOff' => 'تشغيل الصوت', 'announce' => 'التذكرة :t، تفضّل إلى :r.', 'announceDesk' => 'التذكرة :t، تفضّل إلى المكتب.',
        'board' => 'شاشة الدور', 'more' => '+:n أخرى',
    ];
    $t = array_replace($ar ? $arabic : $en, (array) $labels);
    $clock = $now ?? nq_ws_now();
    $entries = array_values((array) $entries);
    $rooms = array_values((array) $rooms);
    $active = nq_ws_serving($entries);
    $board = array_map(fn ($room) => ['room' => $room, 'entry' => collect($active)->first(fn ($e) => ($e['room'] ?? null) === $room)], $rooms);
    $unassigned = array_values(array_filter($active, fn ($e) => empty($e['room']) || ! in_array($e['room'], $rooms, true)));
    $waiting = nq_ws_order($entries);
    $recent = array_values(array_filter($entries, fn ($e) => isset($e['calledAt']) && ! in_array($e['status'] ?? '', ['waiting', 'left'], true)));
    usort($recent, fn ($a, $b) => ($b['calledAt'] ?? 0) <=> ($a['calledAt'] ?? 0));
    $recent = array_slice($recent, 0, 6);
    $local = \Carbon\Carbon::createFromTimestampMs($clock)->locale($locale);
    $time = $local->isoFormat('h:mm A');
    $date = $local->isoFormat('dddd D MMMM');
    $cfg = ['sound' => (bool) $sound, 'highlightMs' => (int) $highlightMs, 'locale' => $locale, 'frozen' => $now !== null, 'serverNow' => $clock, 'on' => $t['soundOn'], 'off' => $t['soundOff']];
    $announceFor = fn ($e) => ! empty($e['room'])
        ? str_replace([':t', ':r'], [$e['ticket'], str_replace(':n', $e['room'], $t['room'])], $t['announce'])
        : str_replace(':t', $e['ticket'], $t['announceDesk']);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'lobby-display') }}" aria-label="{{ $t['board'] }}" x-data="nqLobbyDisplay(@js($cfg))"
    {{ $attributes->except('data-slot')->cn('@container flex w-full flex-col gap-[2cqi] bg-background p-[2cqi] text-foreground [container-type:inline-size]') }}>
    <div aria-live="assertive" aria-atomic="true" class="sr-only" x-text="announcement"></div>

    <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
            @if ($clinic)
                <h1 class="truncate text-[clamp(1.25rem,3cqi,2.5rem)] font-semibold leading-tight">{{ $clinic }}</h1>
            @endif
            <p class="text-[clamp(0.8rem,1.6cqi,1.25rem)] text-muted-foreground"><bdi data-date>{{ $date }}</bdi></p>
        </div>
        <div class="flex items-center gap-4">
            <x-nq::waiting-screen.live-indicator :connection="$connection" :updated-at="$updatedAt" :now="$now" :labels="$labels" :locale="$locale" />
            <x-nq::button variant="secondary" size="sm" data-sound x-on:click="toggleSound()" x-bind:aria-pressed="sound ? 'true' : 'false'">
                <x-lucide-volume-2 x-show="sound" aria-hidden="true" @style(['display: none' => ! $sound]) />
                <x-lucide-volume-x x-show="! sound" aria-hidden="true" @style(['display: none' => $sound]) />
                <span x-text="soundLabel">{{ $sound ? $t['soundOn'] : $t['soundOff'] }}</span>
            </x-nq::button>
            <bdi dir="ltr" data-clock class="text-[clamp(1.5rem,4.5cqi,4rem)] font-semibold leading-none tabular-nums">{{ $time }}</bdi>
        </div>
    </header>

    <div class="grid gap-[2cqi] @3xl:grid-cols-[2fr_1fr]">
        <section aria-label="{{ $t['nowServing'] }}" class="flex flex-col gap-[1.2cqi]">
            <h2 class="text-[clamp(1rem,2.2cqi,1.75rem)] font-medium text-muted-foreground">{{ $t['nowServing'] }}</h2>
            <ul class="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-[1.5cqi] p-0">
                @foreach ($board as $row)
                    @php($entry = $row['entry'])
                    <li data-room="{{ $row['room'] }}" data-state="{{ $entry ? $entry['status'] : 'free' }}"
                        @if ($entry) data-call="{{ $entry['id'] }}:{{ $entry['calledAt'] ?? '' }}" data-announce="{{ $announceFor($entry) }}" @endif
                        class="{{ \Nasaq\Cn::merge('flex flex-col gap-2 rounded-card border p-[1.6cqi] transition-colors duration-300', $entry ? 'border-nq-line bg-card' : 'border-dashed border-nq-line bg-secondary/60 text-muted-foreground', $entry && $entry['status'] === 'called' ? 'border-primary bg-nq-selected' : '') }}">
                        <div class="flex items-center gap-2 text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium">
                            <x-lucide-door-open aria-hidden="true" class="size-[1.2em]" />
                            {{ str_replace(':n', $row['room'], $t['room']) }}
                        </div>
                        @if ($entry)
                            <bdi dir="ltr" class="whitespace-nowrap text-center font-mono text-[clamp(2rem,5cqi,5.5rem)] font-semibold leading-none tracking-wider tabular-nums">{{ $entry['ticket'] }}</bdi>
                            <div class="flex items-center justify-center gap-2 text-[clamp(0.8rem,1.6cqi,1.4rem)]">
                                @if ($entry['status'] === 'called')
                                    <x-lucide-bell-ring aria-hidden="true" class="size-[1.2em]" />
                                    {{ $t['called'] }}
                                @else
                                    <x-lucide-stethoscope aria-hidden="true" class="size-[1.2em]" />
                                    {{ $t['inVisit'] }}
                                @endif
                            </div>
                        @else
                            <p class="py-[2cqi] text-center text-[clamp(1rem,2.4cqi,2rem)]">{{ $t['free'] }}</p>
                        @endif
                    </li>
                @endforeach
                @foreach ($unassigned as $e)
                    <li data-call="{{ $e['id'] }}:{{ $e['calledAt'] ?? '' }}" data-announce="{{ $announceFor($e) }}" class="flex flex-col items-center gap-2 rounded-card border border-nq-line bg-card p-[1.6cqi]">
                        <bdi dir="ltr" class="font-mono text-[clamp(2rem,5cqi,5rem)] font-semibold tabular-nums">{{ $e['ticket'] }}</bdi>
                    </li>
                @endforeach
            </ul>
        </section>

        <div class="flex flex-col gap-[2cqi]">
            <section aria-label="{{ $t['upNext'] }}" class="flex flex-col gap-2 rounded-card border border-nq-line p-[1.6cqi]">
                <h2 class="flex items-baseline justify-between text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium text-muted-foreground">
                    {{ $t['upNext'] }}
                    <span class="text-[0.8em]">{{ $t['waiting'] }}: {{ count($waiting) }}</span>
                </h2>
                @if (count($waiting) === 0)
                    <p class="text-[clamp(0.85rem,1.6cqi,1.3rem)] text-muted-foreground">{{ $t['nobodyWaiting'] }}</p>
                @else
                    <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
                        @foreach (array_slice($waiting, 0, (int) $upNext) as $e)
                            <li class="rounded-control bg-secondary px-3 py-1.5">
                                <bdi dir="ltr" class="font-mono text-[clamp(1.1rem,2.6cqi,2.25rem)] font-semibold tabular-nums">{{ $e['ticket'] }}</bdi>
                            </li>
                        @endforeach
                        @if (count($waiting) > (int) $upNext)
                            <li class="self-center text-[clamp(0.8rem,1.5cqi,1.2rem)] text-muted-foreground">{{ str_replace(':n', count($waiting) - (int) $upNext, $t['more']) }}</li>
                        @endif
                    </ul>
                @endif
            </section>

            <section aria-label="{{ $t['recent'] }}" class="flex flex-col gap-2 rounded-card border border-nq-line p-[1.6cqi]">
                <h2 class="text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium text-muted-foreground">{{ $t['recent'] }}</h2>
                @if (count($recent) === 0)
                    <p class="text-[clamp(0.85rem,1.6cqi,1.3rem)] text-muted-foreground">{{ $t['none'] }}</p>
                @else
                    <ul class="m-0 grid list-none gap-1.5 p-0">
                        @foreach ($recent as $e)
                            <li class="flex items-center justify-between gap-3 text-[clamp(1rem,2cqi,1.75rem)]">
                                <bdi dir="ltr" class="font-mono font-semibold tabular-nums">{{ $e['ticket'] }}</bdi>
                                <span class="text-muted-foreground">{{ ! empty($e['room']) ? str_replace(':n', $e['room'], $t['room']) : '' }}</span>
                            </li>
                        @endforeach
                    </ul>
                @endif
            </section>
        </div>
    </div>
</div>

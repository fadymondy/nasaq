{{-- <x-nq::waiting-screen :entries="$queue" entry-id="q-17" :rooms="2" connection="live" leaveable />
     What a patient sees on their phone after checking in: the ticket number, how many people are ahead, the estimated wait, who is being served
     now, and a loud banner (plus a short vibration, needs the Alpine runtime) when it is their turn. Position and estimate are computed from
     entries with the same rules reception uses. entries: arrays of ['id', 'ticket', 'number', 'status' (waiting|called|serving|done|skipped|no_show|left),
     'priority' (normal|appointment|urgent), 'queuedAt' (epoch ms), 'calledAt', 'room', 'providerId']. entry-id: this patient. average-minutes (10), rooms (1),
     clinic, connection (live|reconnecting|offline), updated-at (epoch ms), now (epoch ms, freezes the clock).
     leaveable: shows Leave the line (while waiting), which dispatches a bubbling "nq-leave" after the user confirms. error: message to show under it.
     labels: array overriding the built-in words. locale overrides the app's. Renders nothing when the entry is not in the queue. --}}
@include('nasaq::components.waiting-screen._logic')
@props(['entries' => [], 'entryId', 'averageMinutes' => 10, 'rooms' => 1, 'clinic' => null, 'connection' => 'live', 'updatedAt' => null, 'now' => null, 'leaveable' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ws_words($locale, $labels);
    $entry = collect($entries)->firstWhere('id', $entryId);
@endphp
@if ($entry)
    @php
        $status = $entry['status'] ?? 'waiting';
        $position = nq_ws_position($entries, $entryId);
        $wait = nq_ws_wait($entries, $entryId, $averageMinutes, (int) $rooms);
        $serving = nq_ws_serving($entries);
        $roomName = ! empty($entry['room']) ? nq_ws_fill($t['room'], $entry['room']) : '';
        $banner = match ($status) {
            'called' => ['success', 'bell-ring', $t['called'], $roomName !== '' ? nq_ws_fill($t['calledText'], $roomName) : $t['calledNoRoom']],
            'serving' => ['info', 'stethoscope', $t['serving'], $roomName !== '' ? nq_ws_fill($t['servingText'], $roomName) : ''],
            'done' => ['success', 'circle-check', $t['done'], $t['doneText']],
            'skipped', 'no_show' => ['warning', 'users', $t['skipped'], $t['skippedText']],
            'left' => ['info', 'log-out', $t['left'], $t['leftText']],
            default => null,
        };
    @endphp
    <div data-slot="waiting-screen" data-status="{{ $status }}" x-data="nqWaitingScreen" {{ $attributes->cn('mx-auto flex w-full max-w-md flex-col gap-4') }}>
        <div class="flex items-center justify-between gap-2">
            @if ($clinic)
                <h2 class="text-label font-semibold">{{ $clinic }}</h2>
            @else
                <span></span>
            @endif
            <x-nq::waiting-screen.live-indicator :connection="$connection" :updated-at="$updatedAt" :now="$now" :labels="$labels" :locale="$locale" />
        </div>
        @if ($connection === 'offline')
            <x-nq::alert tone="warning">{{ $t['offlineText'] }}</x-nq::alert>
        @endif

        @if ($banner)
            <x-nq::alert :tone="$banner[0]" :icon="$banner[1]" :title="$banner[2]" :role="$status === 'called' ? 'alert' : 'status'" :class="$status === 'called' ? 'motion-safe:animate-pulse' : ''">{{ $banner[3] }}</x-nq::alert>
        @endif

        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $t['yourTicket'] }}</x-nq::card.title>
                @if ($status === 'waiting')
                    <x-nq::badge variant="warning" class="justify-self-end">
                        <x-lucide-hourglass aria-hidden="true" class="size-3" />
                        {{ $t['waiting'] }}
                    </x-nq::badge>
                @endif
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-4">
                <bdi dir="ltr" data-slot="waiting-ticket" class="text-center font-mono text-[3.5rem] font-semibold leading-none tracking-wider tabular-nums">{{ $entry['ticket'] }}</bdi>
                @if ($status === 'waiting')
                    <div class="grid grid-cols-2 gap-3 border-t border-nq-line pt-4">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-caption text-muted-foreground">{{ $t['position'] }}</span>
                            <span class="text-h2 tabular-nums"><x-nq::numeric :value="$position" :locale="$locale" /></span>
                            <span class="text-caption text-muted-foreground">{{ nq_ws_ahead($position - 1, $t) }}</span>
                        </div>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-caption text-muted-foreground">{{ $t['wait'] }}</span>
                            <span class="text-h2">{{ nq_ws_minutes($wait, $t) }}</span>
                        </div>
                    </div>
                @endif
            </x-nq::card.content>
        </x-nq::card>

        <section aria-label="{{ $t['nowServing'] }}" aria-live="polite" class="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
            <h3 class="text-label font-semibold">{{ $t['nowServing'] }}</h3>
            @if (count($serving) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $t['nobody'] }}</p>
            @else
                <ul class="m-0 grid list-none gap-2 p-0">
                    @foreach ($serving as $s)
                        <li class="flex items-center justify-between gap-3 rounded-control px-3 py-2 {{ $s['id'] === $entryId ? 'bg-nq-selected' : 'bg-secondary' }}">
                            <bdi dir="ltr" class="font-mono text-h3 tabular-nums">{{ $s['ticket'] }}</bdi>
                            @if (! empty($s['room']))
                                <span class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
                                    <x-lucide-door-open aria-hidden="true" class="size-4" />
                                    {{ nq_ws_fill($t['room'], $s['room']) }}
                                </span>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @endif
        </section>

        @if ($leaveable && $status === 'waiting')
            <x-nq::alert-dialog.confirm-button variant="ghost" :title="$t['leaveTitle']" :description="$t['leaveText']" :confirm-label="$t['leaveConfirm']" x-on:click="$dispatch('nq-leave')">
                <x-lucide-log-out aria-hidden="true" />
                {{ $t['leave'] }}
            </x-nq::alert-dialog.confirm-button>
        @endif
        @if ($error)
            <p role="alert" class="text-caption text-nq-danger-text">{{ $error }}</p>
        @endif
    </div>
@endif

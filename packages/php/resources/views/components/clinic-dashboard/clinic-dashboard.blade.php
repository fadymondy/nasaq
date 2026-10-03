{{-- <x-nq::clinic-dashboard :rooms="$rooms" :doctors="$doctors" :queued-at="$joinedAt" connection="live" :updated-at="$ms" />
     The clinic at a glance for the front desk: waiting count and longest wait, doctors on duty, room use, then a card per room and a row per
     doctor. Every state has an icon and a word, never colour alone. Read only.
     rooms: arrays of ['id', 'name', 'status' (free|busy|cleaning|closed), 'doctorId', 'ticket', 'since' (epoch ms)].
     doctors: arrays of ['id', 'name', 'specialty', 'avatar', 'status' (available|in_visit|break|off), 'roomId', 'shift' => ['start' => 'HH:mm', 'end' => 'HH:mm'], 'waiting'].
     queued-at: epoch ms each waiting patient joined the queue. connection: live | reconnecting | offline. updated-at: epoch ms of the last data.
     selectable: rooms and doctors become buttons that dispatch a bubbling "nq-clinic-room-select" or "nq-clinic-doctor-select" with { id } (needs the Alpine runtime).
     now: epoch ms that freezes the clock (default: the server's clock; re-render to refresh). labels: array overriding any built-in word.
     The default slot is extra content after the figures, for example a chart. --}}
@include('nasaq::components.waiting-screen._logic')
@props(['rooms' => [], 'doctors' => [], 'queuedAt' => [], 'connection' => 'live', 'updatedAt' => null, 'selectable' => false, 'now' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $en = [
        'title' => 'Clinic today', 'waiting' => 'Waiting now', 'longest' => 'Longest wait', 'average' => 'Average :n min', 'minutes' => ':n min',
        'onDuty' => 'Doctors on duty', 'ofTotal' => 'of :n', 'occupancy' => 'Rooms in use', 'rooms' => 'Rooms', 'roomsHint' => ':f free, :b in use',
        'doctors' => 'Doctors on duty', 'noDoctors' => 'No doctor is on duty right now.', 'noRooms' => 'No rooms set up.',
        'noneWaiting' => 'No one waiting', 'waitingFor' => ':n waiting', 'since' => ':n min',
        'room' => ['free' => 'Free', 'busy' => 'In use', 'cleaning' => 'Cleaning', 'closed' => 'Closed'],
        'doctor' => ['available' => 'Available', 'in_visit' => 'In a visit', 'break' => 'On a break', 'off' => 'Off'],
    ];
    $arabic = [
        'title' => 'العيادة اليوم', 'waiting' => 'في الانتظار الآن', 'longest' => 'أطول انتظار', 'average' => 'المتوسط :n دقيقة', 'minutes' => ':n دقيقة',
        'onDuty' => 'الأطباء المناوبون', 'ofTotal' => 'من :n', 'occupancy' => 'الغرف المستخدمة', 'rooms' => 'الغرف', 'roomsHint' => ':f فارغة، :b مستخدمة',
        'doctors' => 'الأطباء المناوبون', 'noDoctors' => 'لا يوجد طبيب مناوب الآن.', 'noRooms' => 'لا توجد غرف.',
        'noneWaiting' => 'لا أحد ينتظر', 'waitingFor' => ':n ينتظرون', 'since' => ':n د',
        'room' => ['free' => 'فارغة', 'busy' => 'مستخدمة', 'cleaning' => 'قيد التنظيف', 'closed' => 'مغلقة'],
        'doctor' => ['available' => 'متاح', 'in_visit' => 'في زيارة', 'break' => 'في استراحة', 'off' => 'خارج الدوام'],
    ];
    $t = array_replace_recursive($ar ? $arabic : $en, (array) $labels);
    $n = fn (string $s, string|int $v) => str_replace(':n', (string) $v, $s);
    $clock = $now ?? nq_ws_now();
    $rooms = array_values((array) $rooms);
    $doctors = array_values((array) $doctors);
    $queuedAt = array_values((array) $queuedAt);

    // Waiting figures (clinic-math.waitingFigures).
    $waits = array_map(fn ($q) => max(0, ($clock - $q) / 60000), $queuedAt);
    $waitingCount = count($waits);
    $longest = $waitingCount ? (int) floor(max($waits)) : 0;
    $average = $waitingCount ? (int) round(array_sum($waits) / $waitingCount) : 0;
    // Doctors on duty (clinic-math.doctorsOnDuty): inside the shift and not off.
    $local = \Carbon\Carbon::createFromTimestampMs($clock);
    $minuteOfDay = $local->hour * 60 + $local->minute;
    $hm = function (string $v): float {
        return preg_match('/^(\d{1,2}):(\d{2})$/', $v, $m) ? (int) $m[1] * 60 + (int) $m[2] : NAN;
    };
    $duty = array_values(array_filter($doctors, function ($d) use ($minuteOfDay, $hm) {
        if (($d['status'] ?? '') === 'off') {
            return false;
        }
        if (empty($d['shift'])) {
            return true;
        }

        return $minuteOfDay >= $hm($d['shift']['start']) && $minuteOfDay < $hm($d['shift']['end']);
    }));
    $counts = ['free' => 0, 'busy' => 0, 'cleaning' => 0, 'closed' => 0];
    foreach ($rooms as $r) {
        $counts[$r['status']]++;
    }
    $open = count($rooms) - $counts['closed'];
    $occupancy = $open === 0 ? 0 : (int) round($counts['busy'] / $open * 100);
    $roomStyle = ['free' => ['door-open', 'success'], 'busy' => ['bed-double', 'warning'], 'cleaning' => ['sparkles', 'info'], 'closed' => ['door-closed', 'neutral']];
    $doctorBadge = ['available' => 'success', 'in_visit' => 'warning', 'break' => 'info', 'off' => 'neutral'];
    $roomBase = 'flex flex-col gap-1.5 rounded-card border border-border bg-card p-3';
    $roomBtn = 'flex w-full flex-col gap-1.5 rounded-card border border-border bg-card p-3 text-start outline-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus';
    $docBtn = 'flex w-full items-center gap-3 rounded-control py-2.5 text-start outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'clinic-dashboard') }}" @if ($selectable) x-data @endif {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-h3">{{ $t['title'] }}</h2>
        <x-nq::waiting-screen.live-indicator :connection="$connection" :updated-at="$updatedAt" :now="$now" :locale="$locale" />
    </div>

    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$t['waiting']" :value="$waitingCount" :locale="$locale">
            <x-slot:icon><x-lucide-users /></x-slot:icon>
        </x-nq::stat-card>
        <x-nq::stat-card :label="$t['longest']" :locale="$locale">
            <x-slot:icon><x-lucide-clock /></x-slot:icon>
            <span class="tabular-nums">{{ $n($t['minutes'], $longest) }}</span>
        </x-nq::stat-card>
        <x-nq::stat-card :label="$t['onDuty']" :value="count($duty)" :locale="$locale">
            <x-slot:icon><x-lucide-stethoscope /></x-slot:icon>
        </x-nq::stat-card>
        <x-nq::stat-card :label="$t['occupancy']" :locale="$locale">
            <x-slot:icon><x-lucide-bed-double /></x-slot:icon>
            <span class="tabular-nums">{{ $occupancy }}%</span>
        </x-nq::stat-card>
    </x-nq::stat-card.grid>

    <section aria-label="{{ $t['rooms'] }}" class="flex flex-col gap-2">
        <h3 class="text-label">{{ $t['rooms'] }}</h3>
        @if (count($rooms) === 0)
            <p class="text-body-sm text-muted-foreground">{{ $t['noRooms'] }}</p>
        @else
            <ul class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 p-0">
                @foreach ($rooms as $r)
                    @php
                        [$icon, $badge] = $roomStyle[$r['status']];
                        $doc = collect($doctors)->firstWhere('id', $r['doctorId'] ?? null);
                        $minutes = $r['status'] === 'busy' && isset($r['since']) ? max(0, (int) floor(($clock - $r['since']) / 60000)) : 0;
                    @endphp
                    <li>
                        @if ($selectable)
                            <button type="button" data-slot="clinic-room" data-status="{{ $r['status'] }}" x-on:click="$dispatch('nq-clinic-room-select', { id: '{{ $r['id'] }}' })" class="{{ $roomBtn }}">
                        @else
                            <div data-slot="clinic-room" data-status="{{ $r['status'] }}" class="{{ $roomBase }}">
                        @endif
                            <span class="flex items-center justify-between gap-2">
                                <span class="text-label">{{ $r['name'] }}</span>
                                <x-nq::badge :variant="$badge">
                                    <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-3" />
                                    {{ $t['room'][$r['status']] }}
                                </x-nq::badge>
                            </span>
                            @if ($doc)<span class="text-caption text-muted-foreground">{{ $doc['name'] }}</span>@endif
                            @if ($r['status'] === 'busy')
                                <span class="flex items-center gap-2 text-caption text-muted-foreground">
                                    @if (! empty($r['ticket']))<bdi dir="ltr" class="font-mono font-semibold tabular-nums text-foreground">{{ $r['ticket'] }}</bdi>@endif
                                    <span class="tabular-nums">{{ $n($t['since'], $minutes) }}</span>
                                </span>
                            @endif
                        @if ($selectable)
                            </button>
                        @else
                            </div>
                        @endif
                    </li>
                @endforeach
            </ul>
            <x-nq::progress :value="$occupancy" :locale="$locale" aria-label="{{ $t['occupancy'] }}" class="mt-1" />
        @endif
    </section>

    <x-nq::card data-slot="clinic-doctors">
        <x-nq::card.header>
            <x-nq::card.title as="h3">{{ $t['doctors'] }}</x-nq::card.title>
            <x-nq::card.description><x-nq::numeric :value="count($duty)" :locale="$locale" /> {{ $n($t['ofTotal'], count($doctors)) }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content>
            @if (count($duty) === 0)
                <p class="text-body-sm text-muted-foreground">{{ $t['noDoctors'] }}</p>
            @else
                <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
                    @foreach ($duty as $d)
                        @php $room = collect($rooms)->firstWhere('id', $d['roomId'] ?? null); @endphp
                        <li>
                            @if ($selectable)
                                <button type="button" data-slot="clinic-doctor" x-on:click="$dispatch('nq-clinic-doctor-select', { id: '{{ $d['id'] }}' })" class="{{ $docBtn }}">
                            @else
                                <div data-slot="clinic-doctor" class="flex items-center gap-3 py-2.5">
                            @endif
                                <x-nq::avatar :name="$d['name']" :src="$d['avatar'] ?? null" />
                                <span class="min-w-0 flex-1">
                                    <span class="block truncate text-label">{{ $d['name'] }}</span>
                                    <span class="block truncate text-caption text-muted-foreground">{{ $d['specialty'] ?? '' }}{{ $room ? ' · '.$room['name'] : '' }}@if (! empty($d['shift'])) · <bdi dir="ltr" class="tabular-nums">{{ $d['shift']['start'] }} - {{ $d['shift']['end'] }}</bdi>@endif</span>
                                </span>
                                <span class="flex flex-col items-end gap-1">
                                    <x-nq::badge :variant="$doctorBadge[$d['status']]">{{ $t['doctor'][$d['status']] }}</x-nq::badge>
                                    <span class="text-caption text-muted-foreground">{{ ($d['waiting'] ?? 0) === 0 ? $t['noneWaiting'] : $n($t['waitingFor'], $d['waiting']) }}</span>
                                </span>
                            @if ($selectable)
                                </button>
                            @else
                                </div>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @endif
        </x-nq::card.content>
    </x-nq::card>
    {{ $slot }}
</div>

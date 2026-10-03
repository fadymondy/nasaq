{{-- <x-nq::clinic-schedule :appointments="$appointments" x-on:select="openVisit($event.detail.id)" />
     A doctor's day: a day timeline with each appointment named and coloured by status (the status word is in the block title, so colour is never the only cue),
     a count per status, the visit in progress, the next patient with how late they are, and a warning when appointments overlap. Read only.
     appointments: arrays of ['id', 'patient', 'service', 'start', 'end' (local ISO strings or DateTime), 'status' (requested|confirmed|checked_in|in_visit|done|no_show|cancelled), 'room', 'followUp'].
     Any days; the schedule shows the one in date (default today).
     date: the day shown first. working-hours: ['start' => 8, 'end' => 18]. now: pins the clock (for tests and docs; default the server's clock). locale: default the app locale.
     Fires "select" ({ id }) on the root when an appointment block or an Open button is used; "slot-select" ({ start, end }) and "date-change" ({ date }) bubble up from the day scheduler.
     The side column follows the day the scheduler shows. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['appointments' => [], 'date' => null, 'workingHours' => ['start' => 8, 'end' => 18], 'now' => null, 'locale' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $locale ??= app()->getLocale();
    $iso = fn ($v) => $v instanceof \DateTimeInterface ? $v->format('Y-m-d\TH:i:s') : (string) $v;
    $clock = $now === null ? now()->format('Y-m-d\TH:i:s') : $iso($now);
    $statuses = [
        'requested' => ['Requested', 'مطلوب', 'warning'],
        'confirmed' => ['Confirmed', 'مؤكد', 'neutral'],
        'checked_in' => ['Checked in', 'تم تسجيل الوصول', 'info'],
        'in_visit' => ['In visit', 'في الزيارة', 'brand'],
        'done' => ['Done', 'منتهي', 'success'],
        'no_show' => ['No-show', 'لم يحضر', 'danger'],
        'cancelled' => ['Cancelled', 'ملغى', 'danger'],
    ];
    $rows = array_values(array_map(fn ($a) => [
        'id' => (string) $a['id'],
        'patient' => (string) $a['patient'],
        'service' => (string) ($a['service'] ?? ''),
        'start' => $iso($a['start']),
        'end' => $iso($a['end']),
        'status' => $a['status'] ?? 'requested',
        'room' => $a['room'] ?? null,
        'followUp' => (bool) ($a['followUp'] ?? false),
    ], (array) $appointments));
    $events = array_map(fn ($a) => [
        'id' => $a['id'],
        'title' => $a['patient'].' · '.$t::t($statuses[$a['status']][0] ?? 'Requested', $statuses[$a['status']][1] ?? 'مطلوب'),
        'start' => $a['start'],
        'end' => $a['end'],
        // The Scheduler tone for each status: waiting states are neutral or info, the live visit is brand, done is success, problems warn or fail.
        'tone' => ['requested' => 'warning', 'confirmed' => 'neutral', 'checked_in' => 'info', 'in_visit' => 'brand', 'done' => 'success', 'no_show' => 'danger', 'cancelled' => 'danger'][$a['status']] ?? 'neutral',
    ], $rows);
    $config = [
        'appointments' => $rows,
        'date' => $date === null ? null : $iso($date),
        'now' => $clock,
        'locale' => str_replace('_', '-', $locale),
        'strings' => [
            'hours' => $t::t('{h} h {m} min', '{h} س {m} د'),
            'late' => $t::t('{n} min late', 'متأخر {n} دقيقة'),
            'room' => $t::t('Room {r}', 'الغرفة {r}'),
            'followUp' => $t::t('Follow-up', 'متابعة'),
            'overlapOne' => $t::t('1 pair of appointments overlaps.', 'يوجد موعدان متداخلان.'),
            'overlapMany' => $t::t('{n} pairs of appointments overlap.', 'يوجد {n} أزواج من المواعيد المتداخلة.'),
        ],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'clinic-schedule') }}" x-data="nqClinicSchedule({!! \Illuminate\Support\Js::from($config) !!})" x-on:date-change="setDate($event.detail.date)" x-on:event-click="pick($event.detail.id)"
    {{ $attributes->except('data-slot')->cn('grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-start') }}>
    <div class="min-w-0">
        <x-nq::scheduler :events="$events" view="day" :date="$date === null ? $clock : $date" :working-hours="$workingHours" :slot-minutes="15" :today="$clock" :locale="$locale" />
        <p x-show="empty" style="display: none" class="mt-3 text-body-sm text-muted-foreground">{{ $t::t('No appointments on this day.', 'لا مواعيد في هذا اليوم.') }}</p>
    </div>

    <div class="flex flex-col gap-4">
        <x-nq::card>
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $t::t('Today at a glance', 'اليوم في لمحة') }}</x-nq::card.title>
                <x-nq::card.description><bdi x-text="dayLabel"></bdi></x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-3">
                <dl class="m-0 grid grid-cols-2 gap-3">
                    <div>
                        <dt class="text-caption text-muted-foreground">{{ $t::t('Booked', 'محجوز') }}</dt>
                        <dd class="m-0 text-h2 tabular-nums"><bdi data-slot="num" data-numeric="" class="tabular-nums" x-text="total"></bdi></dd>
                    </div>
                    <div>
                        <dt class="text-caption text-muted-foreground">{{ $t::t('Still to see', 'متبقٍ') }}</dt>
                        <dd class="m-0 text-h2 tabular-nums"><bdi data-slot="num" data-numeric="" class="tabular-nums" x-text="remaining"></bdi></dd>
                    </div>
                    <div class="col-span-2">
                        <dt class="text-caption text-muted-foreground">{{ $t::t('Booked time', 'الوقت المحجوز') }}</dt>
                        <dd class="m-0 text-body-sm tabular-nums" x-text="bookedLabel"></dd>
                    </div>
                </dl>
                <ul aria-label="{{ $t::t('Status legend', 'دليل الحالات') }}" class="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    @foreach ($statuses as $s => $_)
                        <li x-show="count('{{ $s }}') > 0" style="display: none" class="inline-flex items-center gap-1">
                            <x-nq::booking-pipeline.status-badge :status="$s" />
                            <span class="text-caption tabular-nums text-muted-foreground"><bdi data-slot="num" data-numeric="" class="tabular-nums" x-text="countLabel('{{ $s }}')"></bdi></span>
                        </li>
                    @endforeach
                </ul>
            </x-nq::card.content>
        </x-nq::card>

        <div x-show="current" style="display: none">
            <x-nq::card data-slot="clinic-current">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t::t('In visit now', 'في الزيارة الآن') }}</x-nq::card.title>
                    <x-nq::card.description><span x-text="current ? current.service : ''"></span></x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex items-center justify-between gap-2">
                    <span class="text-label" x-text="current ? current.patient : ''"></span>
                    <x-nq::button size="sm" variant="secondary" x-on:click="current ? pick(current.id) : null">
                        {{ $t::t('Open', 'فتح') }}
                        <x-lucide-arrow-right aria-hidden="true" class="rtl:rotate-180" />
                    </x-nq::button>
                </x-nq::card.content>
            </x-nq::card>
        </div>

        <x-nq::card data-slot="clinic-next">
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $t::t('Next up', 'التالي') }}</x-nq::card.title>
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-2">
                <div x-show="next" style="display: none" class="flex flex-col gap-2">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="text-label" x-text="next ? next.patient : ''"></p>
                            <p class="text-caption text-muted-foreground" x-text="nextDetail"></p>
                        </div>
                        @foreach ($statuses as $s => $_)
                            <div x-show="next ? next.status === '{{ $s }}' : false" style="display: none" class="contents">
                                <x-nq::booking-pipeline.status-badge :status="$s" />
                            </div>
                        @endforeach
                    </div>
                    <p class="inline-flex items-center gap-1.5 text-body-sm">
                        <x-lucide-clock aria-hidden="true" class="size-4 text-muted-foreground" />
                        <bdi x-text="nextTime"></bdi>
                        <span x-show="nextRoom" style="display: none" class="text-muted-foreground">· <span x-text="nextRoom"></span></span>
                        <span x-show="late" style="display: none" class="font-medium text-nq-warning-text">· <span x-text="lateLabel"></span></span>
                    </p>
                    <x-nq::button size="sm" variant="secondary" x-on:click="next ? pick(next.id) : null">{{ $t::t('Open', 'فتح') }}</x-nq::button>
                </div>
                <p x-show="!next" class="text-body-sm text-muted-foreground">{{ $t::t('No one is waiting.', 'لا أحد في الانتظار.') }}</p>
            </x-nq::card.content>
        </x-nq::card>

        <x-nq::alert tone="warning" icon="triangle-alert" x-show="overlapCount" style="display: none"><span x-text="overlapLabel"></span></x-nq::alert>
    </div>
</div>

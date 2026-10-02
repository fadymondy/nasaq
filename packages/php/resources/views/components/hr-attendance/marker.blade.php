{{-- <x-nq::hr-attendance.marker /> (inside <x-nq::hr-attendance>)
     A clock-in card: the state (working, on break, clocked out), hours worked today, the punch buttons that fit that state and today's punch list. Lateness is judged from the first clock-in against the shift.
     Punches fire hr-punch from the root (veto it with event.detail.fail). loading: a skeleton instead of the hours. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['breaks' => true, 'place' => null, 'labels' => []])
@props(['loading' => false])
@php
    $L = fn ($k, $en, $ar) => data_get($labels, $k) ?? \Nasaq\Nasaq::t($en, $ar);
@endphp
<x-nq::card data-slot="attendance-marker" x-bind:data-state="state()" :aria-busy="$loading ? 'true' : null" :class="\Nasaq\Cn::merge('gap-4 px-0', (string) $attributes->get('class'))">
    <x-nq::card.header>
        <x-nq::card.title as="h2" class="flex items-center gap-2 text-muted-foreground">
            <x-lucide-clock aria-hidden="true" class="size-4" />
            {{ $L('attendance', 'Attendance', 'الحضور') }}
        </x-nq::card.title>
        <div class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <x-nq::status tone="neutral" x-show="state() === 'out'">{{ $L('clockedOut', 'Clocked out', 'تم تسجيل الانصراف') }}</x-nq::status>
            <x-nq::status tone="success" x-show="state() === 'in'" style="display: none">{{ $L('clockedIn', 'Working', 'على رأس العمل') }}</x-nq::status>
            <x-nq::status tone="warning" x-show="state() === 'break'" style="display: none">{{ $L('onBreak', 'On break', 'في استراحة') }}</x-nq::status>
        </div>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-1">
        @if ($loading)
            <x-nq::states.skeleton class="h-9 w-32" />
        @else
            <p class="text-h1 font-semibold tracking-tight text-foreground" aria-live="off"><bdi class="tabular-nums" dir="ltr" x-text="workedText()">0h 00m</bdi></p>
        @endif
        <p class="text-body-sm text-muted-foreground" x-text="workedLine()">{{ $L('workedToday', 'Worked today', 'ساعات العمل اليوم') }}</p>
        <p class="text-caption text-muted-foreground" x-show="shiftText()" style="display: none"><bdi dir="ltr" x-text="shiftText()"></bdi></p>
        @if ($place)
            <p class="flex items-center gap-1 text-caption text-muted-foreground"><x-lucide-map-pin aria-hidden="true" class="size-3" />{{ $place }}</p>
        @endif
        <p x-show="hasLateInfo()" style="display: none" x-bind:class="lateMinutes() ? 'text-caption text-nq-warning-text' : 'text-caption text-nq-success-text'" x-text="lateText()"></p>
    </x-nq::card.content>
    <x-nq::card.content class="flex flex-wrap gap-2">
        <x-nq::button variant="primary" x-show="state() === 'out'" x-on:click="punch('in')" x-bind:aria-busy="busy === 'in' ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
            <x-nq::spinner x-show="busy === 'in'" style="display: none" />
            <x-lucide-log-in aria-hidden="true" />
            {{ $L('clockIn', 'Clock in', 'تسجيل حضور') }}
        </x-nq::button>
        @if ($breaks)
            <x-nq::button x-show="state() === 'in'" style="display: none" x-on:click="punch('break-start')" x-bind:aria-busy="busy === 'break-start' ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                <x-nq::spinner x-show="busy === 'break-start'" style="display: none" />
                <x-lucide-coffee aria-hidden="true" />
                {{ $L('startBreak', 'Start break', 'بدء استراحة') }}
            </x-nq::button>
            <x-nq::button variant="primary" x-show="state() === 'break'" style="display: none" x-on:click="punch('break-end')" x-bind:aria-busy="busy === 'break-end' ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                <x-nq::spinner x-show="busy === 'break-end'" style="display: none" />
                <x-lucide-undo-2 aria-hidden="true" class="rtl:-scale-x-100" />
                {{ $L('endBreak', 'End break', 'إنهاء الاستراحة') }}
            </x-nq::button>
        @endif
        <x-nq::button x-show="state() !== 'out'" style="display: none" x-on:click="punch('out')" x-bind:aria-busy="busy === 'out' ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
            <x-nq::spinner x-show="busy === 'out'" style="display: none" />
            <x-lucide-log-out aria-hidden="true" />
            {{ $L('clockOut', 'Clock out', 'تسجيل انصراف') }}
        </x-nq::button>
    </x-nq::card.content>
    <x-nq::card.content x-show="error" style="display: none">
        <p role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="error"></span></p>
    </x-nq::card.content>
    <x-nq::card.content class="flex flex-col gap-2">
        <h3 class="text-caption font-medium text-muted-foreground">{{ $L('punches', "Today's punches", 'بصمات اليوم') }}</h3>
        <p class="text-body-sm text-muted-foreground" x-show="!punches.length">{{ $L('noPunches', 'No punches yet today.', 'لا توجد بصمات اليوم بعد.') }}</p>
        <ol class="flex flex-col divide-y divide-border rounded-card bg-nq-surface" x-show="punches.length" style="display: none">
            <template x-for="p in sortedPunches()" x-bind:key="p.id">
                <li class="flex items-center gap-3 px-3 py-2 text-body-sm" x-bind:data-kind="p.kind">
                    <x-lucide-log-in aria-hidden="true" x-show="p.kind === 'in'" class="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                    <x-lucide-log-out aria-hidden="true" x-show="p.kind === 'out'" class="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                    <x-lucide-coffee aria-hidden="true" x-show="p.kind === 'break-start'" class="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                    <x-lucide-clock aria-hidden="true" x-show="p.kind === 'break-end'" class="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                    <span class="min-w-0 flex-1 truncate text-foreground" x-text="punchLabel(p.kind)"></span>
                    <span class="hidden truncate text-caption text-muted-foreground sm:inline" x-show="p.place" x-text="p.place"></span>
                    <time class="text-muted-foreground" x-text="time(p.at)"></time>
                </li>
            </template>
        </ol>
    </x-nq::card.content>
</x-nq::card>

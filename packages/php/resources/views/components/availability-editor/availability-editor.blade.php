{{-- <x-nq::availability-editor :value="$availability" x-on:nq-availability-save="$event.detail.promise = fetch('/availability', { method: 'PUT', body: JSON.stringify($event.detail.value) })" />
     A provider's availability: weekly hours with breaks per day, copy one day to the others, and vacations picked as a date range. Problems (overlaps,
     an end before a start, a break outside the hours) show beside the row and block saving. Times are 24 hour "HH:mm".
     value: ['weekly' => [7 days, index 0 = Sunday, each ['enabled' => bool, 'ranges' => [['start' => '09:00', 'end' => '17:00']], 'breaks' => [...]]],
     'vacations' => [['id' => 'v1', 'from' => '2026-10-04', 'to' => '2026-10-06', 'reason' => 'Conference']]]. week-starts-on: 0 = Sunday (default 6, Saturday).
     minute-step: minutes between choices in the time pickers (15). labels: array overriding any built-in word. locale overrides the app's.
     Fires a bubbling "nq-availability-change" { value } on every edit and "nq-availability-save" { value } on Save: a listener may set
     event.detail.promise to a Promise (or one resolving to { error }) to keep the editor open with a message. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'weekStartsOn' => 6, 'minuteStep' => 15, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $en = [
        'weekly' => 'Weekly hours', 'weeklyHint' => 'The hours patients can book. Breaks are taken out of them.', 'total' => ':h h :m min a week', 'totalHours' => ':h h a week',
        'dayOn' => 'Open on :d', 'closed' => 'Closed', 'hours' => ':h h :m min', 'hoursShort' => ':h h', 'to' => 'To', 'addHours' => 'Add hours', 'addBreak' => 'Add break',
        'breaks' => 'Breaks', 'remove' => 'Remove', 'copyAll' => 'Copy to other open days', 'vacations' => 'Vacations and days off', 'vacationsHint' => 'No one can book these days.',
        'pickDates' => 'Pick the days away', 'reason' => 'Reason (optional)', 'addVacation' => 'Add', 'noVacations' => 'No vacations planned.',
        'daysOne' => '1 day', 'daysTwo' => ':n days', 'daysFew' => ':n days', 'daysMany' => ':n days', 'save' => 'Save availability', 'saving' => 'Saving',
        'reset' => 'Discard changes', 'saved' => 'Availability saved.', 'failed' => 'It could not be saved. Try again.', 'fix' => 'Fix these before saving',
        'issue' => ['end-before-start' => 'ends before it starts', 'invalid-time' => 'has a time that is not valid', 'overlap' => 'overlaps another one',
            'break-outside-hours' => 'is outside the open hours', 'vacation-order' => 'ends before it starts', 'vacation-overlap' => 'overlaps another vacation', 'no-hours' => 'is open but has no hours'],
        'hoursWord' => 'hours', 'breakWord' => 'break', 'vacationWord' => 'Vacation', 'startLabel' => 'Start :n', 'endLabel' => 'End :n',
    ];
    $arabic = [
        'weekly' => 'ساعات العمل الأسبوعية', 'weeklyHint' => 'الساعات التي يمكن للمرضى الحجز فيها. تُخصم الاستراحات منها.', 'total' => ':h س :m د في الأسبوع', 'totalHours' => ':h س في الأسبوع',
        'dayOn' => 'مفتوح يوم :d', 'closed' => 'مغلق', 'hours' => ':h س :m د', 'hoursShort' => ':h س', 'to' => 'إلى', 'addHours' => 'إضافة ساعات', 'addBreak' => 'إضافة استراحة',
        'breaks' => 'الاستراحات', 'remove' => 'حذف', 'copyAll' => 'نسخ إلى الأيام المفتوحة الأخرى', 'vacations' => 'الإجازات وأيام الغياب', 'vacationsHint' => 'لا يمكن الحجز في هذه الأيام.',
        'pickDates' => 'اختر أيام الغياب', 'reason' => 'السبب (اختياري)', 'addVacation' => 'إضافة', 'noVacations' => 'لا إجازات مخططة.',
        'daysOne' => 'يوم واحد', 'daysTwo' => 'يومان', 'daysFew' => ':n أيام', 'daysMany' => ':n يومًا', 'save' => 'حفظ أوقات العمل', 'saving' => 'جارٍ الحفظ',
        'reset' => 'تجاهل التغييرات', 'saved' => 'تم حفظ أوقات العمل.', 'failed' => 'تعذّر الحفظ. حاول مجددًا.', 'fix' => 'صحّح هذه الأخطاء قبل الحفظ',
        'issue' => ['end-before-start' => 'ينتهي قبل أن يبدأ', 'invalid-time' => 'به وقت غير صالح', 'overlap' => 'يتداخل مع آخر', 'break-outside-hours' => 'خارج ساعات العمل',
            'vacation-order' => 'ينتهي قبل أن يبدأ', 'vacation-overlap' => 'يتداخل مع إجازة أخرى', 'no-hours' => 'مفتوح بلا ساعات'],
        'hoursWord' => 'ساعات العمل', 'breakWord' => 'استراحة', 'vacationWord' => 'إجازة', 'startLabel' => 'البداية :n', 'endLabel' => 'النهاية :n',
    ];
    $t = array_replace_recursive($ar ? $arabic : $en, (array) $labels);
    $blank = ['weekly' => array_fill(0, 7, ['enabled' => false, 'ranges' => [], 'breaks' => []]), 'vacations' => []];
    $value = is_array($value) ? $value : $blank;
    $strings = array_intersect_key($t, array_flip(['total', 'totalHours', 'hours', 'hoursShort', 'closed', 'dayOn', 'startLabel', 'endLabel', 'remove', 'saved', 'failed', 'vacationWord', 'breakWord', 'hoursWord', 'daysOne', 'daysTwo', 'daysFew', 'daysMany', 'issue']));
    $cfg = ['value' => $value, 'weekStartsOn' => (int) $weekStartsOn, 'locale' => $locale, 'strings' => $strings];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'availability-editor') }}" x-data="nqAvailabilityEditor(@js($cfg))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::card>
        <x-nq::card.header class="flex-row items-start justify-between gap-3">
            <div>
                <x-nq::card.title as="h2">{{ $t['weekly'] }}</x-nq::card.title>
                <x-nq::card.description>{{ $t['weeklyHint'] }}</x-nq::card.description>
            </div>
            <p class="text-label tabular-nums" x-text="totalText"></p>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col divide-y divide-border">
            <template x-for="d in order" x-bind:key="d">
                <section data-slot="availability-day" x-bind:aria-label="dayName(d)" x-bind:data-open="av.weekly[d].enabled ? '' : null" class="grid gap-3 py-3 sm:grid-cols-[10rem_1fr]">
                    <div class="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-start">
                        <label class="flex items-center gap-2 text-label">
                            <x-nq::switch x-model="av.weekly[d].enabled" x-bind:aria-label="dayLabel(d)" />
                            <span x-text="dayName(d)"></span>
                        </label>
                        <span class="text-caption text-muted-foreground" x-text="dayHours(d)"></span>
                    </div>
                    <div x-show="av.weekly[d].enabled" class="flex flex-col gap-3">
                        @foreach (['ranges', 'breaks'] as $list)
                            <div @if ($list === 'breaks') x-show="hasBreaks(d)" @endif class="flex flex-col gap-2">
                                @if ($list === 'breaks')
                                    <p class="text-caption text-muted-foreground">{{ $t['breaks'] }}</p>
                                @endif
                                <ul class="m-0 flex list-none flex-col gap-2 p-0">
                                    <template x-for="(r, i) in av.weekly[d].{{ $list }}" x-bind:key="i">
                                        <li class="flex flex-wrap items-center gap-2 rounded-control" x-bind:data-invalid="issueAt(d, '{{ $list }}', i) ? '' : null"
                                            x-bind:class="issueAt(d, '{{ $list }}', i) ? 'outline outline-1 outline-nq-danger' : ''">
                                            <x-nq::date-picker.time x-model="r.start" :minute-step="$minuteStep" :locale="$locale" x-bind:aria-label="timeLabel(d, 'start', i)" />
                                            <span aria-hidden="true" class="text-muted-foreground">{{ $t['to'] }}</span>
                                            <x-nq::date-picker.time x-model="r.end" :minute-step="$minuteStep" :locale="$locale" x-bind:aria-label="timeLabel(d, 'end', i)" />
                                            <x-nq::button size="icon" variant="ghost" x-on:click="removeRange(d, '{{ $list }}', i)" x-bind:aria-label="removeLabel(d, i)">
                                                <x-lucide-trash-2 aria-hidden="true" />
                                            </x-nq::button>
                                            <span class="text-caption text-nq-danger-text" x-text="issueAt(d, '{{ $list }}', i)"></span>
                                        </li>
                                    </template>
                                </ul>
                                @if ($list === 'ranges')
                                    <p class="text-caption text-nq-danger-text" x-show="noHours(d)" x-text="noHoursText()"></p>
                                @endif
                            </div>
                        @endforeach
                        <div class="flex flex-wrap gap-2">
                            <x-nq::button size="sm" variant="secondary" x-on:click="addRange(d, 'ranges')"><x-lucide-plus aria-hidden="true" />{{ $t['addHours'] }}</x-nq::button>
                            <x-nq::button size="sm" variant="ghost" x-on:click="addRange(d, 'breaks')"><x-lucide-plus aria-hidden="true" />{{ $t['addBreak'] }}</x-nq::button>
                            <x-nq::button size="sm" variant="ghost" x-on:click="copyToOthers(d)"><x-lucide-copy aria-hidden="true" />{{ $t['copyAll'] }}</x-nq::button>
                        </div>
                    </div>
                </section>
            </template>
        </x-nq::card.content>
    </x-nq::card>

    <x-nq::card>
        <x-nq::card.header>
            <x-nq::card.title as="h2">{{ $t['vacations'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['vacationsHint'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <div class="flex flex-wrap items-end gap-2">
                <x-nq::field class="w-full sm:w-auto">
                    <x-nq::field.label>{{ $t['pickDates'] }}</x-nq::field.label>
                    <x-nq::date-picker.range x-model="range" :placeholder="$t['pickDates']" :aria-label="$t['pickDates']" :locale="$locale" class="sm:w-72" />
                </x-nq::field>
                <x-nq::field class="min-w-40 flex-1">
                    <x-nq::field.label>{{ $t['reason'] }}</x-nq::field.label>
                    <x-nq::field.input x-model="reason" />
                </x-nq::field>
                <x-nq::button variant="secondary" x-on:click="addVacation()" x-bind:disabled="canAddVacation ? null : ''"><x-lucide-plus aria-hidden="true" />{{ $t['addVacation'] }}</x-nq::button>
            </div>
            <p class="text-body-sm text-muted-foreground" x-show="noVacations">{{ $t['noVacations'] }}</p>
            <ul class="m-0 flex list-none flex-col gap-2 p-0" x-show="! noVacations">
                <template x-for="v in av.vacations" x-bind:key="v.id">
                    <li data-slot="availability-vacation" class="flex items-center gap-3 rounded-control border border-border p-2" x-bind:class="vacationIssue(v.id) ? 'border-nq-danger' : ''">
                        <x-lucide-palmtree aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                        <div class="min-w-0 flex-1">
                            <p class="text-label">
                                <bdi x-text="dateText(v.from)"></bdi>
                                <template x-if="! oneDay(v)"><span><span> - </span><bdi x-text="dateText(v.to)"></bdi></span></template>
                                <span class="ms-2 text-caption text-muted-foreground" x-text="daysText(v)"></span>
                            </p>
                            <p class="truncate text-caption text-muted-foreground" x-show="v.reason" x-text="v.reason"></p>
                            <p class="text-caption text-nq-danger-text" x-show="vacationIssue(v.id)" x-text="vacationIssue(v.id)"></p>
                        </div>
                        <x-nq::button size="icon" variant="ghost" x-on:click="removeVacation(v.id)" x-bind:aria-label="vacationRemoveLabel()"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                    </li>
                </template>
            </ul>
        </x-nq::card.content>
    </x-nq::card>

    <div x-show="hasIssues" style="display: none">
        <x-nq::alert tone="danger" :title="$t['fix']">
            <ul class="m-0 ps-4">
                <template x-for="(i, k) in issues" x-bind:key="k"><li x-text="issueText(i)"></li></template>
            </ul>
        </x-nq::alert>
    </div>
    <div x-show="okMessage" style="display: none">
        <x-nq::alert tone="success"><span x-text="messageText"></span></x-nq::alert>
    </div>
    <div x-show="badMessage" style="display: none">
        <x-nq::alert tone="danger"><span x-text="messageText"></span></x-nq::alert>
    </div>

    <div class="flex flex-wrap justify-end gap-2">
        <x-nq::button variant="ghost" x-on:click="discard()" x-bind:disabled="canDiscard ? null : ''">{{ $t['reset'] }}</x-nq::button>
        <x-nq::button x-on:click="save()" x-bind:disabled="canSave ? null : ''"><span x-text="busy ? '{{ $t['saving'] }}' : '{{ $t['save'] }}'">{{ $t['save'] }}</span></x-nq::button>
    </div>
</div>

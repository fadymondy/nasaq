{{-- <x-nq::cron-builder value="0 9 * * 1-5" time-zone="Asia/Riyadh" />
     A schedule anyone can fill in: pick "every weekday at 09:00" from simple settings, or type the cron expression itself. It says the schedule
     in words (English or Arabic), names the field that is wrong, and lists the next runs in the chosen time zone. The value is always the cron string.
     cron string is x-modelable: x-model="cron" / wire:model="cron" work. Fires "value-change" ({ value, valid }) and "time-zone-change" ({ timeZone }).
     time-zone: an IANA zone (default UTC). time-zones: the zones offered (default a short list; the current one is always added). hide-time-zone.
     presets: [['id' => 'daily-9', 'value' => '0 9 * * *', 'label' => 'Daily']] or false to hide them (default: every 5 minutes, hourly, daily, weekdays, weekly, monthly).
     preview-count: how many next runs (default 5). now: pin the preview's "now" (a date string or DateTime), for tests and docs. disabled. label: the group's accessible name.
     The words, the next runs and the validation run in the browser (the cron math ships with the Alpine runtime); the server paints the controls.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => '0 9 * * 1-5', 'timeZone' => 'UTC', 'timeZones' => null, 'hideTimeZone' => false, 'presets' => null, 'previewCount' => 5, 'now' => null, 'disabled' => false, 'label' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $value = (string) $value;
    $zoneOk = fn ($z) => is_string($z) && in_array($z, \DateTimeZone::listIdentifiers(\DateTimeZone::ALL_WITH_BC), true) || $z === 'UTC';
    $zone = $zoneOk($timeZone) ? $timeZone : 'UTC';
    $zones = array_values(array_unique(array_filter(
        array_merge([$zone], $timeZones ?? ['UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Africa/Cairo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney']),
        $zoneOk
    )));
    $presetList = $presets === false ? [] : ($presets ?? [
        ['id' => 'every-5-min', 'value' => '*/5 * * * *', 'label' => $t::t('Every 5 minutes', 'كل 5 دقائق')],
        ['id' => 'hourly', 'value' => '0 * * * *', 'label' => $t::t('Hourly', 'كل ساعة')],
        ['id' => 'daily-9', 'value' => '0 9 * * *', 'label' => $t::t('Daily at 09:00', 'يوميًا عند 09:00')],
        ['id' => 'weekdays-9', 'value' => '0 9 * * 1-5', 'label' => $t::t('Weekdays at 09:00', 'أيام العمل عند 09:00')],
        ['id' => 'weekly-mon', 'value' => '0 9 * * 1', 'label' => $t::t('Mondays at 09:00', 'الاثنين عند 09:00')],
        ['id' => 'monthly-1st', 'value' => '0 9 1 * *', 'label' => $t::t('Monthly on the 1st', 'شهريًا في اليوم الأول')],
    ]);
    $nowMs = $now === null ? null : ($now instanceof \DateTimeInterface ? $now->getTimestamp() * 1000 : (is_numeric($now) ? (int) $now : \Carbon\Carbon::parse($now)->getTimestamp() * 1000));
    $days = [
        [$t::t('Sun', 'أحد'), $t::t('Sunday', 'الأحد')], [$t::t('Mon', 'اثنين'), $t::t('Monday', 'الاثنين')], [$t::t('Tue', 'ثلاثاء'), $t::t('Tuesday', 'الثلاثاء')],
        [$t::t('Wed', 'أربعاء'), $t::t('Wednesday', 'الأربعاء')], [$t::t('Thu', 'خميس'), $t::t('Thursday', 'الخميس')], [$t::t('Fri', 'جمعة'), $t::t('Friday', 'الجمعة')],
        [$t::t('Sat', 'سبت'), $t::t('Saturday', 'السبت')],
    ];
    $frequencies = [
        'minutes' => $t::t('Every few minutes', 'كل بضع دقائق'), 'hours' => $t::t('Every few hours', 'كل بضع ساعات'), 'daily' => $t::t('Every day', 'كل يوم'),
        'weekly' => $t::t('Every week', 'كل أسبوع'), 'monthly' => $t::t('Every month', 'كل شهر'),
    ];
    $config = [
        'value' => $value,
        'zone' => $zone,
        'now' => $nowMs,
        'previewCount' => (int) $previewCount,
        'strings' => [
            'custom' => $t::t('Custom schedule', 'جدول مخصص'),
            'invalid' => $t::t('Not a valid schedule', 'جدول غير صالح'),
            'nextNone' => $t::t('This schedule never runs.', 'هذا الجدول لن يعمل أبدًا.'),
            'fieldNames' => [$t::t('minute', 'الدقيقة'), $t::t('hour', 'الساعة'), $t::t('day of month', 'يوم الشهر'), $t::t('month', 'الشهر'), $t::t('day of week', 'يوم الأسبوع')],
            'errors' => [
                'empty' => $t::t('Enter a cron expression.', 'أدخل تعبير كرون.'),
                'fields' => $t::t('A cron expression has five fields separated by spaces.', 'يتكون تعبير كرون من خمسة حقول مفصولة بمسافات.'),
                'syntax' => $t::t('The {field} field has a value that cannot be read: {token}.', 'في حقل {field} قيمة لا يمكن قراءتها: {token}.'),
                'range' => $t::t('The {field} field is out of range: {token}.', 'حقل {field} خارج النطاق: {token}.'),
                'step' => $t::t('The {field} field has a step that does not fit: {token}.', 'في حقل {field} خطوة غير مناسبة: {token}.'),
            ],
        ],
    ];
    // Which tab to paint first: a PHP port of cronToSimple's "can this be shown as simple settings" test. The browser corrects it if they ever differ.
    $simpleStart = (function (string $expr) {
        $macros = ['@monthly' => '0 0 1 * *', '@weekly' => '0 0 * * 0', '@daily' => '0 0 * * *', '@midnight' => '0 0 * * *', '@hourly' => '0 * * * *'];
        $text = strtolower(trim($expr));
        $f = preg_split('/\s+/', $macros[$text] ?? $text, -1, PREG_SPLIT_NO_EMPTY);
        if (count($f) !== 5 || $f[3] !== '*') return 'cron';
        [$mi, $h, $dom, , $dow] = $f;
        $num = fn ($s, $max) => preg_match('/^\d+$/', $s) && (int) $s <= $max;
        $step = fn ($s, $lo, $hi) => preg_match('/^\*\/(\d+)$/', $s, $m) && (int) $m[1] >= $lo && (int) $m[1] <= $hi;
        if ($dom === '*' && $dow === '*') {
            if (($mi === '*' && $h === '*') || ($step($mi, 2, 59) && $h === '*')) return 'simple';
            if ($num($mi, 59) && ($h === '*' || $step($h, 2, 23) || $num($h, 23))) return 'simple';
            return 'cron';
        }
        if (! ($num($mi, 59) && $num($h, 23))) return 'cron';
        if ($dom === '*' && preg_match('/^[0-7](,[0-7])*$/', $dow)) return 'simple';
        return $dow === '*' && $num($dom, 31) && (int) $dom >= 1 ? 'simple' : 'cron';
    })($value);
@endphp
<div data-slot="cron-builder" role="group" aria-label="{{ $label ?? $t::t('Schedule', 'الجدولة') }}"
    x-data="nqCronBuilder(@js($config))" x-modelable="cron" x-id="['nq-cron']"
    {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4') }}>
    @if (count($presetList))
        <div role="group" aria-label="{{ $t::t('Common schedules', 'جداول شائعة') }}" class="flex flex-wrap gap-2">
            @foreach ($presetList as $p)
                @php $on = trim($value) === $p['value']; @endphp
                <x-nq::button variant="primary" size="sm" aria-pressed="true" :disabled="$disabled" x-show="isPreset({{ $js($p['value']) }})" x-on:click="setValue({{ $js($p['value']) }})" :style="$on ? null : 'display: none'">{{ $p['label'] }}</x-nq::button>
                <x-nq::button variant="secondary" size="sm" aria-pressed="false" :disabled="$disabled" x-show="! isPreset({{ $js($p['value']) }})" x-on:click="setValue({{ $js($p['value']) }})" :style="$on ? 'display: none' : null">{{ $p['label'] }}</x-nq::button>
            @endforeach
        </div>
    @endif

    <x-nq::tabs default-value="{{ $simpleStart }}" x-model="pane" class="gap-4">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="simple">{{ $t::t('Simple', 'مبسّط') }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="cron">{{ $t::t('Cron expression', 'تعبير كرون') }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="simple" class="flex flex-col gap-4">
            <div role="status" x-show="! isSimple" style="display: none" class="flex flex-wrap items-center gap-3 rounded-control border border-border bg-nq-surface-soft p-3 text-body-sm text-muted-foreground">
                <x-lucide-circle-alert aria-hidden="true" class="size-4 shrink-0" />
                <span class="min-w-0 flex-1">{{ $t::t('This schedule cannot be shown as simple settings. Edit the cron expression, or start over from a simple one.', 'لا يمكن عرض هذا الجدول كإعدادات مبسّطة. عدّل تعبير كرون، أو ابدأ من جدول مبسّط.') }}</span>
                <x-nq::button variant="secondary" size="sm" :disabled="$disabled" x-on:click="startOver()">{{ $t::t('Start over', 'ابدأ من جديد') }}</x-nq::button>
            </div>
            <div x-show="isSimple" class="grid gap-4 sm:grid-cols-2">
                <x-nq::field :disabled="$disabled">
                    <x-nq::field.label>{{ $t::t('Repeat', 'التكرار') }}</x-nq::field.label>
                    <x-nq::select value="daily" x-model="frequency">
                        <x-nq::select.trigger aria-label="{{ $t::t('Repeat', 'التكرار') }}" :disabled="$disabled">
                            <x-nq::select.value />
                        </x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($frequencies as $k => $name)
                                <x-nq::select.item :value="$k">{{ $name }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <x-nq::field :disabled="$disabled" x-show="frequency === 'minutes' || frequency === 'hours'" style="display: none">
                    <x-nq::field.label>{{ $t::t('Every', 'كل') }} (<span x-text="frequency === 'minutes' ? @js($t::t('minutes', 'دقيقة')) : @js($t::t('hours', 'ساعة'))"></span>)</x-nq::field.label>
                    <x-nq::field.input type="number" inputmode="numeric" ltr min="1" x-bind:max="frequency === 'minutes' ? 59 : 23" x-model.number="every" />
                </x-nq::field>
                <x-nq::field :disabled="$disabled" x-show="frequency === 'hours'" style="display: none">
                    <x-nq::field.label>{{ $t::t('At minute', 'عند الدقيقة') }}</x-nq::field.label>
                    <x-nq::field.input type="number" inputmode="numeric" ltr min="0" max="59" x-model.number="minute" />
                </x-nq::field>
                <x-nq::field :disabled="$disabled" x-show="frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly'">
                    <x-nq::field.label>{{ $t::t('At', 'عند') }}</x-nq::field.label>
                    <x-nq::field.input type="time" ltr x-model="time" />
                </x-nq::field>
                <x-nq::field :disabled="$disabled" x-show="frequency === 'monthly'" style="display: none">
                    <x-nq::field.label>{{ $t::t('Day of the month', 'يوم الشهر') }}</x-nq::field.label>
                    <x-nq::field.input type="number" inputmode="numeric" ltr min="1" max="31" x-model.number="dayOfMonth" />
                </x-nq::field>
                <div x-show="frequency === 'weekly'" style="display: none" class="flex flex-col gap-1.5 sm:col-span-2">
                    <span x-bind:id="$id('nq-cron', 'days')" class="text-label text-foreground">{{ $t::t('On', 'في') }}</span>
                    <x-nq::toggle-group multiple variant="outline" :disabled="$disabled" :default-value="['1']" x-bind:aria-labelledby="$id('nq-cron', 'days')" x-model="weekdays" class="flex-wrap">
                        @foreach ($days as $i => [$short, $long])
                            <x-nq::toggle-group.toggle :value="(string) $i" aria-label="{{ $long }}">{{ $short }}</x-nq::toggle-group.toggle>
                        @endforeach
                    </x-nq::toggle-group>
                </div>
            </div>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="cron">
            <x-nq::field :disabled="$disabled" x-model="expressionInvalid">
                <x-nq::field.label>{{ $t::t('Cron expression', 'تعبير كرون') }}</x-nq::field.label>
                <x-nq::field.input ltr spellcheck="false" autocomplete="off" class="font-mono" placeholder="0 9 * * 1-5" x-model="expression" />
                <x-nq::field.description>{{ $t::t('Five fields: minute, hour, day of month, month, day of week. Ranges 1-5, lists 1,3 and steps */15 work.', 'خمسة حقول: الدقيقة، الساعة، يوم الشهر، الشهر، يوم الأسبوع. تعمل النطاقات 1-5 والقوائم 1,3 والخطوات */15.') }}</x-nq::field.description>
                <p role="alert" x-show="! valid" style="display: none" class="flex items-start gap-2 text-body-sm text-nq-danger-text">
                    <x-lucide-circle-alert aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
                    <span x-text="error"></span>
                </p>
            </x-nq::field>
        </x-nq::tabs.panel>
    </x-nq::tabs>

    <div data-slot="cron-summary" aria-live="polite" class="flex items-start gap-3 rounded-control bg-nq-surface-soft p-3">
        <x-lucide-calendar-clock aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div class="min-w-0">
            <p class="text-caption text-muted-foreground">{{ $t::t('Runs', 'يعمل') }}</p>
            <p x-text="valid ? summary : cfg.strings.invalid" x-bind:class="valid ? 'text-foreground' : 'text-nq-danger-text'" class="text-body"></p>
            <bdi dir="ltr" x-show="valid" x-text="trimmed" class="mt-0.5 block font-mono text-code text-muted-foreground"></bdi>
        </div>
    </div>

    @unless ($hideTimeZone)
        <x-nq::field :disabled="$disabled">
            <x-nq::field.label>
                <span class="inline-flex items-center gap-1.5">
                    <x-lucide-globe aria-hidden="true" class="size-4" />
                    {{ $t::t('Time zone', 'المنطقة الزمنية') }}
                </span>
            </x-nq::field.label>
            <x-nq::select :value="$zone" x-model="zone">
                <x-nq::select.trigger aria-label="{{ $t::t('Time zone', 'المنطقة الزمنية') }}" dir="ltr" :disabled="$disabled">
                    <x-nq::select.value />
                </x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ($zones as $z)
                        <x-nq::select.item :value="$z"><bdi dir="ltr">{{ $z }}</bdi></x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
            <x-nq::field.description>{{ $t::t('The schedule is read in this time zone.', 'يُقرأ الجدول بهذه المنطقة الزمنية.') }}</x-nq::field.description>
        </x-nq::field>
    @endunless

    <section data-slot="cron-next-runs" x-show="valid" aria-label="{{ $t::t('Next runs', 'التشغيلات القادمة') }}" class="flex flex-col gap-2">
        <h3 class="text-label text-foreground">{{ $t::t('Next runs', 'التشغيلات القادمة') }}</h3>
        <p x-show="runs.length === 0" style="display: none" x-text="cfg.strings.nextNone" class="text-body-sm text-muted-foreground"></p>
        <ol x-show="runs.length > 0" style="display: none" class="flex flex-col divide-y divide-border rounded-control border border-border">
            <template x-for="r in runs" x-bind:key="r.key">
                <li class="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2 text-body-sm">
                    <time data-slot="date-time" dir="auto" x-bind:datetime="r.iso" x-text="r.text" class="tabular-nums text-foreground [unicode-bidi:isolate]"></time>
                    <time data-slot="date-time" dir="auto" x-bind:datetime="r.iso" x-text="r.relative" class="tabular-nums text-caption text-muted-foreground [unicode-bidi:isolate]"></time>
                </li>
            </template>
        </ol>
    </section>
</div>

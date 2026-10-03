{{-- <x-nq::cron-builder.schedule-list :schedules="$schedules" run-now editable deletable />
     The schedules you have: what each says in words, its status the last time it was due (ran, failed or missed; an icon and a word),
     when it runs next, and pause, run now, edit and delete.
     schedules: [['id' => 'backup', 'name' => 'Nightly backup', 'cron' => '0 2 * * *', 'timeZone' => 'Asia/Riyadh', 'enabled' => true,
                  'lastRun' => ['at' => '2026-09-14T02:00:00Z', 'status' => 'ok']]]  (status: ok | failed | missed)
     run-now / editable / deletable show those buttons. Fires "toggle" ({ id, enabled }), "run-now", "edit" and "delete" ({ id }) on the list.
     now: pin the "next run" origin (a date string), for tests and docs. loading shows skeletons. The words and next runs are filled in by the browser.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['schedules' => [], 'runNow' => false, 'editable' => false, 'deletable' => false, 'loading' => false, 'now' => null, 'label' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $schedules = array_values((array) $schedules);
    $tones = ['ok' => 'success', 'failed' => 'danger', 'missed' => 'warning'];
    $statusText = ['ok' => $t::t('Ran fine', 'عمل بنجاح'), 'failed' => $t::t('Failed', 'فشل'), 'missed' => $t::t('Missed', 'فاته الموعد')];
    $nowMs = $now === null ? null : ($now instanceof \DateTimeInterface ? $now->getTimestamp() * 1000 : (is_numeric($now) ? (int) $now : \Carbon\Carbon::parse($now)->getTimestamp() * 1000));
    $config = [
        'schedules' => array_map(fn ($s) => ['id' => (string) $s['id'], 'name' => (string) $s['name'], 'cron' => (string) $s['cron'], 'timeZone' => $s['timeZone'] ?? null, 'enabled' => (bool) ($s['enabled'] ?? false)], $schedules),
        'now' => $nowMs,
        'strings' => ['custom' => $t::t('Custom schedule', 'جدول مخصص'), 'invalid' => $t::t('Invalid schedule', 'جدول غير صالح'), 'off' => $t::t('Paused', 'متوقف مؤقتًا')],
    ];
@endphp
@if ($loading)
    <div data-slot="cron-schedule-list" aria-busy="true" {{ $attributes->cn('flex flex-col gap-2') }}>
        @for ($i = 0; $i < 3; $i++)
            <x-nq::states.skeleton class="h-16" />
        @endfor
    </div>
@elseif (count($schedules) === 0)
    <div data-slot="cron-schedule-list" {{ $attributes }}>
        <x-nq::states.empty icon="calendar-clock" :title="$t::t('No schedules yet', 'لا جداول بعد')" :description="$t::t('Create a schedule to run something on a timer.', 'أنشئ جدولًا لتشغيل شيء في مواعيد محددة.')" />
    </div>
@else
    <div data-slot="cron-schedule-list" x-data="nqCronScheduleList(@js($config))" {{ $attributes->cn('flex flex-col gap-2') }}>
        <ul aria-label="{{ $label ?? $t::t('Schedules', 'الجداول') }}" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            @foreach ($schedules as $s)
                @php $id = (string) $s['id']; $last = $s['lastRun'] ?? null; @endphp
                <li data-schedule="{{ $id }}" class="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 {{ ($s['enabled'] ?? false) ? '' : 'opacity-80' }}" x-bind:class="enabled[@js($id)] ? '' : 'opacity-80'">
                    <x-nq::switch :checked="(bool) ($s['enabled'] ?? false)" aria-label="{{ $t::t('Turn on ', 'تشغيل ') }}{{ $s['name'] }}" x-model="enabled[{{ $js($id) }}]" />
                    <div class="min-w-0 flex-1 basis-56">
                        <p class="truncate text-label text-foreground">{{ $s['name'] }}</p>
                        <p class="text-body-sm text-muted-foreground">
                            <span x-text="reading(@js($s['cron']))"></span>
                            <bdi dir="ltr" class="ms-2 font-mono text-code">{{ $s['cron'] }}</bdi>
                            @if (! empty($s['timeZone']))<bdi dir="ltr" class="ms-2 text-caption">{{ $s['timeZone'] }}</bdi>@endif
                        </p>
                    </div>
                    <dl class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-body-sm sm:min-w-64">
                        <dt class="text-muted-foreground">{{ $t::t('Last run', 'آخر تشغيل') }}</dt>
                        <dd class="min-w-0">
                            @if ($last)
                                <span class="flex flex-wrap items-center gap-x-2">
                                    <x-nq::status :tone="$tones[$last['status'] ?? 'ok'] ?? 'neutral'">{{ $statusText[$last['status'] ?? 'ok'] ?? '' }}</x-nq::status>
                                    <x-nq::numeric.date-time :value="$last['at']" date-style="medium" time-style="short" class="text-caption text-muted-foreground" />
                                </span>
                            @else
                                <span class="text-muted-foreground">{{ $t::t('Has not run yet', 'لم يعمل بعد') }}</span>
                            @endif
                        </dd>
                        <dt class="text-muted-foreground">{{ $t::t('Next run', 'التشغيل القادم') }}</dt>
                        <dd><span x-text="next(@js($id), @js($s['cron']), @js($s['timeZone'] ?? null))"></span></dd>
                    </dl>
                    <div class="flex items-center gap-1">
                        @if ($runNow)
                            <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t::t('Run now', 'شغّل الآن') }}: {{ $s['name'] }}" title="{{ $t::t('Run now', 'شغّل الآن') }}" x-on:click="fire('run-now', { id: {{ $js($id) }} })"><x-lucide-play aria-hidden="true" /></x-nq::button>
                        @endif
                        @if ($editable)
                            <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $t::t('Edit', 'تعديل') }}: {{ $s['name'] }}" title="{{ $t::t('Edit', 'تعديل') }}" x-on:click="fire('edit', { id: {{ $js($id) }} })"><x-lucide-pencil aria-hidden="true" /></x-nq::button>
                        @endif
                        @if ($deletable)
                            <x-nq::alert-dialog.confirm-button size="sm" :title="$t::t('Delete ', 'حذف ').$s['name'].$t::t('?', '؟')" :description="$t::t('It stops running and its schedule is lost. Past runs are kept.', 'يتوقف عن العمل ويُفقد جدوله. تبقى التشغيلات السابقة.')" :confirm-label="$t::t('Delete', 'حذف')" x-on:click="fire('delete', { id: {{ $js($id) }} })">{{ $t::t('Delete', 'حذف') }}</x-nq::alert-dialog.confirm-button>
                        @endif
                    </div>
                </li>
            @endforeach
        </ul>
    </div>
@endif

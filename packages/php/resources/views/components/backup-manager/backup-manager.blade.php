{{-- <x-nq::backup-manager :backups="$backups" :schedule="['enabled' => true, 'frequency' => 'daily', 'time' => '02:30']" :retention="['keepLast' => 14, 'maxAgeDays' => 60]" can-download can-delete />
     Backups in one place: a summary (last backup, next run, storage), the history with progress for a running backup or restore, run now, download,
     delete and a restore that needs a confirmation, and a form for the schedule (hourly to monthly) and retention (keep the last N, delete after N days)
     with a live preview of what retention would remove. It is presentational: you listen for events and pass `backups` back on the next render.
     backups: [id, name, createdAt, sizeBytes, kind (scheduled | manual | pre-restore), status (completed | running | failed | restoring), progress 0..100, locked, error].
     schedule: [enabled, frequency (hourly | daily | weekly | monthly), time "HH:MM", dayOfWeek 0 = Sunday]. retention: [keepLast, maxAgeDays].
     loading shows skeletons. can-download / can-delete show those buttons. safety-backup (default true) only changes the restore wording.
     now overrides "now" (tests and examples). labels: array overriding the words.
     Each action fires a bubbling, cancelable event with detail { ..., resolve(result?), reject(message), waitUntil(promise) }:
       "nq-backup-run"       { }                          "nq-backup-restore"   { id }           "nq-backup-save"  { schedule, retention }
       "nq-backup-download"  { id }                       "nq-backup-delete"    { id }
     @nq-backup-run="$event.detail.waitUntil($wire.runNow())". An error (resolve({ error }), reject(message), a rejected promise) is shown in an alert;
     with nobody listening the action counts as done. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.backup-manager._backup-manager')
@props(['backups' => [], 'schedule', 'retention', 'loading' => false, 'canDownload' => false, 'canDelete' => false, 'safetyBackup' => true, 'now' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_backup_strings($locale, $labels);
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $name = fn ($b) => $b['name'] ?? \Carbon\Carbon::createFromTimestampMs(nq_backup_ms($b['createdAt']))->locale(substr($locale, 0, 2))->isoFormat('lll');
    $fill = fn ($s, $n) => str_replace('{name}', $n, $s);
    $sorted = collect($backups)->sortByDesc(fn ($b) => nq_backup_ms($b['createdAt']))->values()->all();
    $isActive = fn ($b) => in_array($b['status'], ['running', 'restoring'], true);
    $busy = (bool) array_filter($backups, $isActive);
    $last = collect($sorted)->first(fn ($b) => in_array($b['status'], ['completed', 'failed'], true));
    $next = nq_backup_next_run($schedule, $now);
    $completed = count(array_filter($backups, fn ($b) => $b['status'] === 'completed'));
    $tone = ['completed' => 'success', 'running' => 'info', 'failed' => 'danger', 'restoring' => 'info'];
    $weekdays = array_map(fn ($d) => \Carbon\Carbon::create(2024, 1, 7 + $d)->locale(substr($locale, 0, 2))->dayName, range(0, 6));
    $config = [
        'schedule' => ['enabled' => (bool) ($schedule['enabled'] ?? false), 'frequency' => $schedule['frequency'] ?? 'daily', 'time' => $schedule['time'] ?? '', 'dayOfWeek' => $schedule['dayOfWeek'] ?? 0],
        'retention' => ['keepLast' => $retention['keepLast'] ?? 1, 'maxAgeDays' => $retention['maxAgeDays'] ?? 0],
        'backups' => array_map(fn ($b) => ['id' => $b['id'], 'at' => nq_backup_ms($b['createdAt']), 'status' => $b['status'], 'locked' => ! empty($b['locked'])], array_values($backups)),
        'now' => $now === null ? null : nq_backup_ms($now),
        'strings' => [
            'prune0' => $t['prune0'], 'prune1' => $t['prune1'], 'prune2' => $t['prune2'], 'pruneN' => $t['pruneN'], 'timeInvalid' => $t['timeInvalid'],
            'saved' => $t['saved'], 'genericError' => $t['genericError'], 'restoreTitle' => $t['restoreTitle'],
        ],
    ];
    $rowButtons = 'flex shrink-0 flex-wrap gap-2';
@endphp
<div data-slot="backup-manager" x-data="nqBackupManager(@js($config))" {{ $attributes->cn('w-full max-w-5xl') }}>
<x-nq::card class="w-full">
    <x-nq::card.header class="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div class="flex flex-col gap-1.5">
            <x-nq::card.title as="h2">{{ $t['title'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $t['description'] }}</x-nq::card.description>
        </div>
        @if ($busy)
            <x-nq::button type="button" variant="primary" class="mt-3 sm:mt-0" disabled>
                <x-lucide-play aria-hidden="true" />
                {{ $t['running'] }}
            </x-nq::button>
        @else
            <x-nq::button type="button" variant="primary" class="mt-3 sm:mt-0" x-on:click="runNow()" x-bind:disabled="starting" x-bind:aria-busy="starting ? 'true' : undefined">
                <x-nq::spinner x-show="starting" x-cloak style="display: none" />
                <x-lucide-play x-show="!starting" aria-hidden="true" />
                {{ $t['runNow'] }}
            </x-nq::button>
        @endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-5">
        <div x-show="error" x-cloak style="display: none">
            <x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert>
        </div>
        <div x-show="notice" x-cloak style="display: none">
            <x-nq::alert tone="success"><span x-text="notice"></span></x-nq::alert>
        </div>

        <dl data-slot="backup-summary" class="grid gap-3 sm:grid-cols-3">
            <div class="flex flex-col gap-1 rounded-card border border-border p-3">
                <dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><x-lucide-archive aria-hidden="true" class="size-3.5" />{{ $t['lastBackup'] }}</dt>
                <dd class="flex flex-col gap-0.5">
                    @if ($last)
                        <x-nq::status :tone="$tone[$last['status']]">{{ $t['status'][$last['status']] }}</x-nq::status>
                        <x-nq::numeric.date-time :value="$last['createdAt']" relative class="text-caption text-muted-foreground" />
                    @else
                        <span class="text-body-sm text-muted-foreground">{{ $t['never'] }}</span>
                    @endif
                </dd>
            </div>
            <div class="flex flex-col gap-1 rounded-card border border-border p-3">
                <dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><x-lucide-calendar-clock aria-hidden="true" class="size-3.5" />{{ $t['nextRun'] }}</dt>
                <dd class="text-body-sm text-foreground">
                    @if ($next)
                        <x-nq::numeric.date-time :value="$next" date-style="medium" time-style="short" />
                    @else
                        <span class="text-muted-foreground">{{ $t['scheduleOff'] }}</span>
                    @endif
                </dd>
            </div>
            <div class="flex flex-col gap-1 rounded-card border border-border p-3">
                <dt class="flex items-center gap-1.5 text-caption text-muted-foreground"><x-lucide-hard-drive aria-hidden="true" class="size-3.5" />{{ $t['storage'] }}</dt>
                <dd class="flex flex-col gap-0.5">
                    <span dir="ltr" class="w-fit text-body-sm tabular-nums text-foreground">{{ nq_backup_bytes(nq_backup_total($backups)) }}</span>
                    <span class="text-caption text-muted-foreground">{{ nq_backup_count($locale, $completed) }}</span>
                </dd>
            </div>
        </dl>

        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-labelledby="backup-history" class="flex min-w-0 flex-col gap-3">
                <h3 id="backup-history" class="text-h4 text-foreground">{{ $t['listTitle'] }}</h3>
                @if ($loading)
                    <div role="status" aria-label="{{ $t['loading'] }}" class="flex flex-col gap-3">
                        @for ($i = 0; $i < 4; $i++)<x-nq::states.skeleton class="h-16 w-full" />@endfor
                    </div>
                @elseif (count($sorted) === 0)
                    <x-nq::states.empty icon="archive" :title="$t['emptyTitle']" :description="$t['emptyBody']" />
                @else
                    <ul aria-label="{{ $t['list'] }}" class="overflow-hidden rounded-card border border-border">
                        @foreach ($sorted as $b)
                            @php
                                $label = $name($b);
                                $active = $isActive($b);
                            @endphp
                            <li data-slot="backup" data-status="{{ $b['status'] }}" class="flex flex-col gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-start sm:justify-between">
                                <div class="flex min-w-0 flex-1 flex-col gap-2">
                                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span class="text-label text-foreground" dir="auto">{{ $label }}</span>
                                        <x-nq::badge variant="outline">{{ $t['kind'][$b['kind']] ?? $b['kind'] }}</x-nq::badge>
                                        @if (! empty($b['locked']))
                                            <span title="{{ $t['locked'] }}" class="inline-flex text-muted-foreground"><x-lucide-lock aria-label="{{ $t['locked'] }}" role="img" class="size-3.5" /></span>
                                        @endif
                                    </div>
                                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                        <x-nq::status :tone="$tone[$b['status']]">{{ $t['status'][$b['status']] }}</x-nq::status>
                                        @if (isset($b['sizeBytes']) && $b['status'] !== 'running')<span dir="ltr" class="tabular-nums">{{ nq_backup_bytes($b['sizeBytes']) }}</span>@endif
                                        @if (! empty($b['name']))<x-nq::numeric.date-time :value="$b['createdAt']" relative />@endif
                                    </div>
                                    @if ($active)
                                        <x-nq::progress :aria-label="$fill($t['progressFor'], $label)" :value="isset($b['progress']) ? nq_backup_clamp($b['progress']) : null" size="sm" tone="info" show-value :locale="$locale" />
                                    @endif
                                    @if ($b['status'] === 'failed' && ! empty($b['error']))
                                        <p class="flex items-center gap-1.5 text-caption text-nq-danger-text">
                                            <x-lucide-circle-alert aria-hidden="true" class="size-3.5 shrink-0" />
                                            <span dir="auto">{{ $b['error'] }}</span>
                                        </p>
                                    @endif
                                </div>
                                @unless ($active)
                                    <div role="group" aria-label="{{ $fill($t['actionsFor'], $label) }}" class="{{ $rowButtons }}">
                                        @if ($b['status'] === 'completed')
                                            <x-nq::button type="button" size="sm" variant="secondary" :disabled="$busy" :aria-label="$fill($t['restoreFor'], $label)" x-on:click="askRestore({{ $js($b['id']) }}, {{ $js($label) }})">
                                                <x-lucide-rotate-ccw aria-hidden="true" class="rtl:-scale-x-100" />
                                                {{ $t['restore'] }}
                                            </x-nq::button>
                                        @endif
                                        @if ($b['status'] === 'completed' && $canDownload)
                                            <x-nq::button type="button" size="sm" variant="ghost" :aria-label="$fill($t['downloadFor'], $label)" x-on:click="act('nq-backup-download', {{ $js($b['id']) }})">
                                                <x-lucide-download aria-hidden="true" />
                                                {{ $t['download'] }}
                                            </x-nq::button>
                                        @endif
                                        @if ($canDelete)
                                            <x-nq::alert-dialog.confirm-button size="sm" variant="danger" :title="$fill($t['deleteTitle'], $label)"
                                                :description="$t['deleteBody']" :confirm-label="$t['deleteConfirm']" :cancel-label="$t['cancel']" x-on:click="act('nq-backup-delete', {{ $js($b['id']) }})">
                                                <x-lucide-trash-2 aria-hidden="true" />
                                                {{ $t['remove'] }}
                                            </x-nq::alert-dialog.confirm-button>
                                        @endif
                                    </div>
                                @endunless
                            </li>
                        @endforeach
                    </ul>
                @endif
            </section>

            <section aria-labelledby="backup-schedule" data-slot="backup-schedule" class="flex flex-col gap-4 rounded-card border border-border p-4 lg:self-start">
                <div class="flex flex-col gap-1">
                    <h3 id="backup-schedule" class="text-h4 text-foreground">{{ $t['scheduleTitle'] }}</h3>
                    <p class="text-body-sm text-muted-foreground">{{ $t['scheduleBody'] }}</p>
                </div>
                <div class="flex items-center justify-between gap-3">
                    <span id="backup-enabled" class="text-label text-foreground">{{ $t['enabled'] }}</span>
                    <x-nq::switch aria-labelledby="backup-enabled" :checked="$config['schedule']['enabled']" x-model="enabled" />
                </div>
                <fieldset x-bind:disabled="!enabled" class="m-0 grid gap-4 border-0 p-0 disabled:opacity-60">
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['frequency'] }}</x-nq::field.label>
                        <x-nq::select :value="$config['schedule']['frequency']" x-model="frequency">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($t['frequencies'] as $value => $label)
                                    <x-nq::select.item :value="$value">{{ $label }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                    <div x-show="frequency === 'weekly'" @if ($config['schedule']['frequency'] !== 'weekly') style="display: none" @endif>
                        <x-nq::field>
                            <x-nq::field.label>{{ $t['weekday'] }}</x-nq::field.label>
                            <x-nq::select :value="(string) $config['schedule']['dayOfWeek']" x-model="dayText">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($weekdays as $i => $label)
                                        <x-nq::select.item :value="(string) $i">{{ $label }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                    </div>
                    <x-nq::field x-model="timeBad">
                        <x-nq::field.label><span x-text="frequency === 'hourly' ? @js($t['minute']) : @js($t['time'])">{{ $config['schedule']['frequency'] === 'hourly' ? $t['minute'] : $t['time'] }}</span></x-nq::field.label>
                        <x-nq::field.input ltr type="time" x-model="time" />
                        <x-nq::field.error><span x-text="timeError"></span></x-nq::field.error>
                        <div x-show="frequency === 'monthly' && !timeBad" @if ($config['schedule']['frequency'] !== 'monthly') style="display: none" @endif><x-nq::field.description>{{ $t['monthlyHint'] }}</x-nq::field.description></div>
                    </x-nq::field>
                </fieldset>
                <div class="flex flex-col gap-1 border-t border-border pt-4">
                    <h4 class="text-label text-foreground">{{ $t['retentionTitle'] }}</h4>
                    <p class="text-caption text-muted-foreground">{{ $t['retentionBody'] }}</p>
                </div>
                <x-nq::field x-model="keepBad">
                    <x-nq::field.label>{{ $t['keepLast'] }} <span class="text-muted-foreground">({{ $t['keepLastSuffix'] }})</span></x-nq::field.label>
                    <x-nq::field.input ltr inputmode="numeric" x-model="keepLast" />
                    <x-nq::field.error>{{ $t['errors']['keepLast'] }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::field x-model="ageBad">
                    <x-nq::field.label>{{ $t['maxAge'] }}</x-nq::field.label>
                    <x-nq::field.input ltr inputmode="numeric" x-model="maxAge" />
                    <x-nq::field.error>{{ $t['errors']['maxAgeDays'] }}</x-nq::field.error>
                    <x-nq::field.description x-show="!ageBad">{{ $t['maxAgeHint'] }}</x-nq::field.description>
                </x-nq::field>
                <p role="status" data-slot="backup-prune" x-show="!retentionBad" x-text="pruneText" class="text-caption text-muted-foreground"></p>
                <x-nq::button type="button" variant="primary" x-on:click="save()" x-bind:disabled="!canSave" x-bind:aria-busy="saving ? 'true' : undefined">
                    <x-nq::spinner x-show="saving" x-cloak style="display: none" />
                    {{ $t['save'] }}
                </x-nq::button>
            </section>
        </div>
    </x-nq::card.content>
</x-nq::card>

<x-nq::dialog x-model="restoreOpen">
    <x-nq::dialog.content :show-close="false">
        <x-nq::dialog.header>
            <x-nq::dialog.title><span x-text="restoreTitle"></span></x-nq::dialog.title>
            <x-nq::dialog.description>{{ $t['restoreBody'] }}</x-nq::dialog.description>
        </x-nq::dialog.header>
        <x-nq::alert tone="warning">{{ $safetyBackup ? $t['restoreSafety'] : $t['restoreBody'] }}</x-nq::alert>
        <label class="flex cursor-pointer items-start gap-2.5 text-body-sm text-foreground">
            <x-nq::checkbox x-model="restoreAck" class="mt-0.5" />
            <span>{{ $t['restoreCheck'] }}</span>
        </label>
        <x-nq::dialog.footer>
            <x-nq::button type="button" variant="ghost" x-on:click="closeRestore()" x-bind:disabled="restoring">{{ $t['cancel'] }}</x-nq::button>
            <x-nq::button type="button" variant="danger" x-on:click="restore()" x-bind:disabled="!restoreAck || restoring" x-bind:aria-busy="restoring ? 'true' : undefined">
                <x-nq::spinner x-show="restoring" x-cloak style="display: none" />
                {{ $t['restoreConfirm'] }}
            </x-nq::button>
        </x-nq::dialog.footer>
    </x-nq::dialog.content>
</x-nq::dialog>
</div>

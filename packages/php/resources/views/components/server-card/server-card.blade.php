{{-- <x-nq::server-card :server="$server" @nq-power="$event.detail.wait(api.power($event.detail.action))" />
     One server: status and address, hardware, live CPU, memory and disk meters with a CPU trend, the last deploy, power controls that depend on the
     state (stopping and force-stopping ask first), snapshots with take, roll back and delete (also on context-click), and a resource limits editor.
     server: id, name, status (running | stopped | starting | stopping | restarting | provisioning | suspended | error), address, region, os,
       limits [cpuCores, memoryMb, diskGb], metrics [cpu, memory, disk (percent), cpuHistory], lastDeploy [ref, at, status (success | failed | running), by],
       snapshots [id, name, createdAt, sizeLabel, status (ready | creating)].
     Actions fire events on the root with detail { ..., wait(promise) }: `nq-power` { action }, `nq-take-snapshot` { name }, `nq-rollback` { snapshotId },
     `nq-delete-snapshot` { snapshotId }, `nq-save-limits` { limits }. Pass a promise to wait() to show the pending state; resolve { error } (or reject)
     to show a message, otherwise the card moves on (a power action sets the matching status; resolve { status } to set another).
     can-take-snapshot, can-rollback, can-delete-snapshot, can-edit-limits (all true) hide the controls you do not handle. loading shows a skeleton.
     labels: override any string. Needs the Alpine runtime. --}}
@props(['server', 'loading' => false, 'canTakeSnapshot' => true, 'canRollback' => true, 'canDeleteSnapshot' => true, 'canEditLimits' => true, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $s = array_merge([
        'status' => [
            'running' => $t::t('Running', 'يعمل'), 'stopped' => $t::t('Stopped', 'متوقف'), 'starting' => $t::t('Starting', 'قيد التشغيل'),
            'stopping' => $t::t('Stopping', 'قيد الإيقاف'), 'restarting' => $t::t('Restarting', 'يعاد تشغيله'), 'provisioning' => $t::t('Setting up', 'قيد الإعداد'),
            'suspended' => $t::t('Suspended', 'معلّق'), 'error' => $t::t('Error', 'خطأ'),
        ],
        'copyAddress' => $t::t('Copy address', 'نسخ العنوان'),
        'hardware' => $t::t('Hardware', 'العتاد'),
        'coresOne' => $t::t('1 vCPU', 'معالج افتراضي واحد'),
        'coresMany' => $t::t('{n} vCPU', '{n} معالجات افتراضية'),
        'cpu' => $t::t('CPU', 'المعالج'),
        'memory' => $t::t('Memory', 'الذاكرة'),
        'disk' => $t::t('Disk', 'القرص'),
        'usage' => $t::t('Live usage', 'الاستخدام المباشر'),
        'cpuTrend' => $t::t('CPU load of {name}, recent', 'حمل معالج {name} مؤخرًا'),
        'noMetrics' => $t::t('Live usage is not available while the server is off.', 'الاستخدام المباشر غير متاح والخادم متوقف.'),
        'lastDeploy' => $t::t('Last deploy', 'آخر نشر'),
        'noDeploy' => $t::t('No deploys yet', 'لا توجد عمليات نشر بعد'),
        'deployStatus' => ['success' => $t::t('Succeeded', 'نجح'), 'failed' => $t::t('Failed', 'فشل'), 'running' => $t::t('In progress', 'قيد التنفيذ')],
        'by' => $t::t('by {name}', 'بواسطة {name}'),
        'power' => $t::t('Power', 'الطاقة'),
        'powerActions' => ['start' => $t::t('Start', 'تشغيل'), 'stop' => $t::t('Stop', 'إيقاف'), 'restart' => $t::t('Restart', 'إعادة تشغيل'), 'force-stop' => $t::t('Force stop', 'إيقاف قسري')],
        'powerConfirmTitle' => $t::t('{action} {name}?', '{action} {name}؟'),
        'powerConfirmBody' => [
            'start' => $t::t('The server boots and services start.', 'يُقلع الخادم وتبدأ الخدمات.'),
            'restart' => $t::t('The server reboots. Connections drop for a minute or so.', 'يُعاد إقلاع الخادم وتنقطع الاتصالات نحو دقيقة.'),
            'stop' => $t::t('The server shuts down cleanly. Sites and services on it go offline until you start it again.', 'يُغلق الخادم بشكل سليم، وتتوقف المواقع والخدمات عليه حتى تشغّله مجددًا.'),
            'force-stop' => $t::t('The power is cut without a clean shutdown. Unsaved data can be lost. Use it only when a normal stop does not work.', 'تُقطع الطاقة دون إغلاق سليم وقد تضيع بيانات غير محفوظة. استخدمه فقط إذا لم ينفع الإيقاف العادي.'),
        ],
        'snapshots' => $t::t('Snapshots', 'اللقطات'),
        'snapshotsBody' => $t::t('Point-in-time copies of the disk. Roll back to return to one.', 'نسخ من القرص في لحظة معينة. ارجع إلى إحداها عند الحاجة.'),
        'takeSnapshot' => $t::t('Take snapshot', 'التقاط لقطة'),
        'snapshotName' => $t::t('Name', 'الاسم'),
        'snapshotNameHint' => $t::t('Optional. Leave empty to name it by date.', 'اختياري. اتركه فارغًا ليُسمّى بالتاريخ.'),
        'snapshotCreate' => $t::t('Create snapshot', 'إنشاء اللقطة'),
        'snapshotsEmpty' => $t::t('No snapshots yet.', 'لا توجد لقطات بعد.'),
        'snapshotCreating' => $t::t('Creating', 'قيد الإنشاء'),
        'justNow' => $t::t('Just now', 'الآن'),
        'rollback' => $t::t('Roll back', 'استرجاع'),
        'rollbackTitle' => $t::t('Roll back to {name}?', 'الرجوع إلى {name}؟'),
        'rollbackBody' => $t::t('The disk returns to how it was in this snapshot. Everything written after it is lost, and the server restarts.', 'يعود القرص إلى حالته في هذه اللقطة. يضيع كل ما كُتب بعدها ويُعاد تشغيل الخادم.'),
        'remove' => $t::t('Delete', 'حذف'),
        'removeTitle' => $t::t('Delete {name}?', 'حذف {name}؟'),
        'removeBody' => $t::t('The snapshot is removed for good. You will not be able to roll back to it.', 'تُحذف اللقطة نهائيًا ولن تتمكن من الرجوع إليها.'),
        'actionsFor' => $t::t('Actions for {name}', 'إجراءات {name}'),
        'limits' => $t::t('Resource limits', 'حدود الموارد'),
        'limitsBody' => $t::t('The most this server may use. Changes apply after a restart.', 'أقصى ما يستهلكه هذا الخادم. تسري التغييرات بعد إعادة التشغيل.'),
        'limitFields' => ['cpuCores' => $t::t('CPU cores', 'أنوية المعالج'), 'memoryMb' => $t::t('Memory (MB)', 'الذاكرة (ميغابايت)'), 'diskGb' => $t::t('Disk (GB)', 'القرص (غيغابايت)')],
        'limitIntegerError' => $t::t('Enter a whole number.', 'أدخل عددًا صحيحًا.'),
        'limitRangeError' => $t::t('Enter a number from {min} to {max}.', 'أدخل رقمًا من {min} إلى {max}.'),
        'limitsSave' => $t::t('Save limits', 'حفظ الحدود'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'loading' => $t::t('Loading server', 'جارٍ تحميل الخادم'),
    ], (array) $labels);
    foreach (['status', 'deployStatus', 'powerActions', 'powerConfirmBody', 'limitFields'] as $group) {
        $s[$group] = (array) $s[$group];
    }
    $sub = fn (string $text, array $vars) => str_replace(array_map(fn ($k) => '{'.$k.'}', array_keys($vars)), array_values($vars), $text);
@endphp
@if ($loading)
    <div data-slot="server-card" aria-busy="true" aria-label="{{ $s['loading'] }}" {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
        <x-nq::card.header>
            <x-nq::states.skeleton class="h-5 w-40" />
            <x-nq::states.skeleton class="h-4 w-56" />
        </x-nq::card.header>
        <x-nq::card.content class="grid gap-3">
            <x-nq::states.skeleton class="h-8 w-full" />
            <x-nq::states.skeleton class="h-8 w-full" />
            <x-nq::states.skeleton class="h-8 w-full" />
        </x-nq::card.content>
    </div>
@else
    @php
        $server = $server + ['region' => null, 'os' => null, 'metrics' => null, 'lastDeploy' => null, 'snapshots' => []];
        $limits = $server['limits'];
        $metrics = $server['metrics'];
        $deploy = $server['lastDeploy'];
        $uid = 'nq-server-'.preg_replace('/[^a-z0-9_-]/i', '', (string) $server['id']);
        $tones = ['success' => ['running'], 'neutral' => ['stopped'], 'info' => ['starting', 'stopping', 'restarting', 'provisioning'], 'warning' => ['suspended'], 'danger' => ['error']];
        $toneOf = fn (string $status) => collect($tones)->search(fn ($list) => in_array($status, $list, true)) ?: 'neutral';
        $locale = app()->getLocale();
        $relative = fn ($v) => \Carbon\Carbon::parse($v instanceof \DateTimeInterface ? $v->format('c') : (is_numeric($v) ? '@'.$v : $v))->locale(substr($locale, 0, 2))->diffForHumans();
        $iso = fn ($v) => \Carbon\Carbon::parse($v instanceof \DateTimeInterface ? $v->format('c') : (is_numeric($v) ? '@'.$v : $v))->toIso8601String();
        $memory = fn ($mb) => $mb >= 1024 ? round($mb / 1024, 1).' GB' : $mb.' MB';
        $diskText = fn ($gb) => $gb >= 1024 ? round($gb / 1024, 1).' TB' : $gb.' GB';
        $percent = fn ($v) => (class_exists(\NumberFormatter::class) ? (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::PERCENT))->format($v / 100) : round($v).'%');
        $clamp = fn ($v) => is_numeric($v) ? max(0, min(100, (float) $v)) : 0;
        $meters = $metrics ? [
            ['key' => 'cpu', 'label' => $s['cpu'], 'icon' => 'cpu', 'value' => $clamp($metrics['cpu']), 'raw' => $metrics['cpu']],
            ['key' => 'memory', 'label' => $s['memory'], 'icon' => 'memory-stick', 'value' => $clamp($metrics['memory']), 'raw' => $metrics['memory']],
            ['key' => 'disk', 'label' => $s['disk'], 'icon' => 'hard-drive', 'value' => $clamp($metrics['disk']), 'raw' => $metrics['disk']],
        ] : [];
        $history = array_values((array) ($metrics['cpuHistory'] ?? []));
        $statusKeys = ['running', 'stopped', 'starting', 'stopping', 'restarting', 'provisioning', 'suspended', 'error'];
        $showSnaps = $canTakeSnapshot || count($server['snapshots']) > 0;
        $hasMenu = $canRollback || $canDeleteSnapshot;
        $init = [
            'status' => $server['status'],
            'limits' => $limits,
            'metrics' => (bool) $metrics,
            'snapshots' => collect($server['snapshots'])->map(fn ($sn) => [
                'id' => (string) $sn['id'], 'name' => $sn['name'], 'sizeLabel' => $sn['sizeLabel'] ?? '', 'creating' => ($sn['status'] ?? 'ready') === 'creating',
                'when' => $relative($sn['createdAt']), 'iso' => $iso($sn['createdAt']),
            ])->values()->all(),
            'strings' => [
                'status' => $s['status'], 'powerActions' => $s['powerActions'], 'powerConfirmTitle' => $s['powerConfirmTitle'], 'powerConfirmBody' => $s['powerConfirmBody'],
                'rollback' => $s['rollback'], 'rollbackTitle' => $s['rollbackTitle'], 'rollbackBody' => $s['rollbackBody'],
                'remove' => $s['remove'], 'removeTitle' => $s['removeTitle'], 'removeBody' => $s['removeBody'],
                'coresOne' => $s['coresOne'], 'coresMany' => $s['coresMany'],
                'limitIntegerError' => $s['limitIntegerError'], 'limitRangeError' => $s['limitRangeError'], 'actionsFor' => $s['actionsFor'], 'justNow' => $s['justNow'], 'genericError' => $s['genericError'],
            ],
        ];
        $icons = ['start' => 'play', 'stop' => 'power', 'restart' => 'rotate-cw', 'force-stop' => 'power-off'];
        $allowedActions = ['running' => ['restart', 'stop', 'force-stop'], 'stopped' => ['start'], 'error' => ['start', 'restart', 'force-stop'], 'starting' => ['force-stop'], 'stopping' => ['force-stop'], 'restarting' => ['force-stop']];
        $powerOrder = ['start', 'restart', 'stop', 'force-stop'];
    @endphp
    <div data-slot="server-card" data-server-name="{{ $server['name'] }}" x-data="nqServerCard({!! \Illuminate\Support\Js::from($init) !!})"
        x-bind:data-status="status" {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
        <x-nq::card.header class="gap-1.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <x-nq::card.title as="h3" class="min-w-0 truncate" dir="auto">{{ $server['name'] }}</x-nq::card.title>
                @foreach (array_keys($tones) as $tone)
                    <x-nq::status :tone="$tone" tinted aria-live="polite" x-show="tone === '{{ $tone }}'" :style="$toneOf($server['status']) === $tone ? '' : 'display: none'"><span x-text="statusLabel">{{ $s['status'][$server['status']] }}</span></x-nq::status>
                @endforeach
            </div>
            <x-nq::card.description class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="inline-flex items-center gap-1">
                    <bdi dir="ltr" class="font-mono text-body-sm tabular-nums">{{ $server['address'] }}</bdi>
                    <x-nq::copy-button :value="$server['address']" size="icon-sm" variant="ghost" :label="$s['copyAddress']" />
                </span>
                @if ($server['region'])
                    <span dir="auto">{{ $server['region'] }}</span>
                @endif
                @if ($server['os'])
                    <bdi dir="ltr">{{ $server['os'] }}</bdi>
                @endif
            </x-nq::card.description>
        </x-nq::card.header>

        <x-nq::card.content class="grid gap-5">
            <x-nq::alert tone="danger" dismissible x-model="hasError" style="display: none"><span x-text="error"></span></x-nq::alert>

            <ul class="flex flex-wrap gap-2" aria-label="{{ $s['hardware'] }}">
                <li><x-nq::badge variant="outline"><x-lucide-cpu aria-hidden="true" /> <bdi x-text="coresLabel">{{ $limits['cpuCores'] === 1 ? $s['coresOne'] : $sub($s['coresMany'], ['n' => $limits['cpuCores']]) }}</bdi></x-nq::badge></li>
                <li><x-nq::badge variant="outline"><x-lucide-memory-stick aria-hidden="true" /> <bdi dir="ltr" x-text="memoryLabel">{{ $memory($limits['memoryMb']) }}</bdi></x-nq::badge></li>
                <li><x-nq::badge variant="outline"><x-lucide-hard-drive aria-hidden="true" /> <bdi dir="ltr" x-text="diskLabel">{{ $diskText($limits['diskGb']) }}</bdi></x-nq::badge></li>
            </ul>

            <section aria-label="{{ $s['usage'] }}" class="grid gap-3">
                @if ($metrics)
                    <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" x-show="live" @unless (in_array($server['status'], ['running', 'error'], true)) style="display: none" @endunless>
                        <div class="grid gap-3">
                            @foreach ($meters as $m)
                                @php
                                    $fraction = $m['value'] / 100;
                                    $tone = $fraction >= 0.95 ? 'danger' : ($fraction >= 0.8 ? 'warning' : 'default');
                                    $fills = ['default' => 'bg-primary', 'warning' => 'bg-nq-warning', 'danger' => 'bg-nq-danger'];
                                @endphp
                                <div data-slot="meter" data-tone="{{ $tone }}" role="meter" aria-labelledby="{{ $uid }}-{{ $m['key'] }}-label" aria-valuemin="0" aria-valuemax="100"
                                    aria-valuenow="{{ $m['value'] }}" aria-valuetext="{{ $percent($m['value']) }}" class="flex w-full flex-col gap-1.5">
                                    <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
                                        <span id="{{ $uid }}-{{ $m['key'] }}-label" class="text-label text-foreground"><span class="inline-flex items-center gap-1.5"><x-dynamic-component :component="'lucide-'.$m['icon']" aria-hidden="true" class="size-3.5" />{{ $m['label'] }}</span></span>
                                        <span aria-hidden="true" class="text-muted-foreground tabular-nums"><bdi dir="ltr">{{ round($m['raw']) }}%</bdi></span>
                                    </div>
                                    <div data-slot="meter-track" class="relative block w-full overflow-hidden rounded-full bg-nq-surface-soft h-1">
                                        <div data-slot="meter-indicator" style="inset-inline-start:0;width:{{ round($fraction * 100, 4) }}%"
                                            class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none {{ $fills[$tone] }}"></div>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                        @if (count($history) > 1)
                            <x-nq::chart.sparkline :data="$history" :label="$sub($s['cpuTrend'], ['name' => $server['name']])" class="h-12 w-full sm:w-40" />
                        @endif
                    </div>
                @endif
                <p class="text-body-sm text-muted-foreground" x-show="! live" @if ($metrics && in_array($server['status'], ['running', 'error'], true)) style="display: none" @endif>{{ $s['noMetrics'] }}</p>
            </section>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
                <span class="text-muted-foreground">{{ $s['lastDeploy'] }}</span>
                @if ($deploy)
                    @php $deployBadge = ['success' => 'success', 'failed' => 'danger', 'running' => 'info']; @endphp
                    <x-nq::badge :variant="$deployBadge[$deploy['status']] ?? 'neutral'">{{ $s['deployStatus'][$deploy['status']] }}</x-nq::badge>
                    <bdi dir="ltr" class="font-mono text-caption">{{ $deploy['ref'] }}</bdi>
                    <x-nq::numeric.date-time :value="$deploy['at']" relative class="text-muted-foreground" />
                    @if (! empty($deploy['by']))
                        <span class="text-muted-foreground">{{ $sub($s['by'], ['name' => $deploy['by']]) }}</span>
                    @endif
                @else
                    <span class="text-muted-foreground">{{ $s['noDeploy'] }}</span>
                @endif
            </div>

            <section aria-label="{{ $s['power'] }}" class="flex flex-wrap items-center gap-2" data-slot="server-power">
                @foreach ($powerOrder as $a)
                    @php $allowed = in_array($a, ($allowedActions[$server['status']] ?? []), true); @endphp
                    <x-nq::button type="button" size="sm" :variant="$a === 'force-stop' ? 'danger' : ($a === 'start' ? 'primary' : 'secondary')" data-power="{{ $a }}"
                        x-show="allows('{{ $a }}')" :style="$allowed ? '' : 'display: none'" x-bind:disabled="busy" x-on:click="requestPower('{{ $a }}')">
                        <x-dynamic-component :component="'lucide-'.$icons[$a]" aria-hidden="true" />
                        {{ $s['powerActions'][$a] }}
                    </x-nq::button>
                @endforeach
                <span class="text-body-sm text-muted-foreground" x-show="transitional" @unless (in_array($server['status'], ['starting', 'stopping', 'restarting', 'provisioning'], true)) style="display: none" @endunless><span x-text="statusLabel"></span>…</span>
                <span class="flex-1"></span>
                @if ($canEditLimits)
                    <x-nq::button type="button" size="sm" variant="ghost" x-on:click="openLimits()">
                        <x-lucide-sliders-horizontal aria-hidden="true" />
                        {{ $s['limits'] }}
                    </x-nq::button>
                @endif
            </section>

            @if ($showSnaps)
                <section aria-labelledby="{{ $uid }}-snaps" class="grid gap-2 border-t border-border pt-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="min-w-0">
                            <h4 id="{{ $uid }}-snaps" class="text-label text-foreground">{{ $s['snapshots'] }}</h4>
                            <p class="text-body-sm text-muted-foreground">{{ $s['snapshotsBody'] }}</p>
                        </div>
                        @if ($canTakeSnapshot)
                            <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="busy" x-on:click="openSnapshot()">
                                <x-lucide-camera aria-hidden="true" />
                                {{ $s['takeSnapshot'] }}
                            </x-nq::button>
                        @endif
                    </div>
                    <p class="rounded-control border border-dashed border-border p-3 text-body-sm text-muted-foreground" x-show="snapshots.length === 0" @if (count($server['snapshots'])) style="display: none" @endif>{{ $s['snapshotsEmpty'] }}</p>
                    <ul class="grid gap-1.5" x-show="snapshots.length > 0" @unless (count($server['snapshots'])) style="display: none" @endunless>
                        <template x-for="sn in snapshots" :key="sn.id">
                            <li class="contents" data-slot="server-snapshot" x-bind:data-snapshot="sn.id">
                                <x-nq::context-menu>
                                    <x-nq::context-menu.trigger tabindex="0"
                                        class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border px-3 py-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                                        <span class="min-w-0 flex-1 truncate text-label text-foreground" dir="auto" x-bind:title="sn.name" x-text="sn.name"></span>
                                        <x-nq::badge variant="info" x-show="sn.creating">{{ $s['snapshotCreating'] }}</x-nq::badge>
                                        <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground" x-show="sn.sizeLabel" x-text="sn.sizeLabel"></bdi>
                                        <time data-slot="date-time" dir="auto" class="tabular-nums [unicode-bidi:isolate] text-caption text-muted-foreground" x-bind:datetime="sn.iso" x-text="sn.when"></time>
                                        @if ($hasMenu)
                                            <x-nq::dropdown-menu>
                                                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" x-bind:aria-label="actionsLabel(sn)" x-show="! sn.creating" class="text-muted-foreground">
                                                    <x-lucide-ellipsis aria-hidden="true" />
                                                </x-nq::dropdown-menu.trigger>
                                                <x-nq::dropdown-menu.content align="end" class="min-w-40">
                                                    @if ($canRollback)
                                                        <x-nq::dropdown-menu.item x-on:click="askSnapshot('rollback', sn)"><x-lucide-history aria-hidden="true" /> {{ $s['rollback'] }}</x-nq::dropdown-menu.item>
                                                    @endif
                                                    @if ($canDeleteSnapshot)
                                                        <x-nq::dropdown-menu.item variant="danger" x-on:click="askSnapshot('delete', sn)"><x-lucide-trash-2 aria-hidden="true" /> {{ $s['remove'] }}</x-nq::dropdown-menu.item>
                                                    @endif
                                                </x-nq::dropdown-menu.content>
                                            </x-nq::dropdown-menu>
                                        @endif
                                    </x-nq::context-menu.trigger>
                                    @if ($hasMenu)
                                        <x-nq::context-menu.content class="min-w-40">
                                            @if ($canRollback)
                                                <x-nq::context-menu.item x-on:click="askSnapshot('rollback', sn)"><x-lucide-history aria-hidden="true" /> {{ $s['rollback'] }}</x-nq::context-menu.item>
                                            @endif
                                            @if ($canDeleteSnapshot)
                                                <x-nq::context-menu.item variant="danger" x-on:click="askSnapshot('delete', sn)"><x-lucide-trash-2 aria-hidden="true" /> {{ $s['remove'] }}</x-nq::context-menu.item>
                                            @endif
                                        </x-nq::context-menu.content>
                                    @endif
                                </x-nq::context-menu>
                            </li>
                        </template>
                    </ul>
                </section>
            @endif
        </x-nq::card.content>

        {{-- One confirm for stop, force stop, roll back and delete, filled from what is pending. --}}
        <x-nq::alert-dialog x-model="confirmOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="confirmTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description><span x-text="confirmBody"></span></x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $s['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action data-slot="confirm-button-action" x-on:click="confirmPending()"><span x-text="confirmLabel"></span></x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>

        @if ($canTakeSnapshot)
            <x-nq::dialog x-model="snapOpen">
                <x-nq::dialog.content>
                    <form data-slot="server-snapshot-dialog" class="grid gap-4" x-on:submit.prevent="submitSnapshot()">
                        <x-nq::dialog.header>
                            <x-nq::dialog.title>{{ $s['takeSnapshot'] }}</x-nq::dialog.title>
                            <x-nq::dialog.description>{{ $s['snapshotsBody'] }}</x-nq::dialog.description>
                        </x-nq::dialog.header>
                        <x-nq::field>
                            <x-nq::field.label>{{ $s['snapshotName'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="snapName" maxlength="60" dir="auto" />
                            <x-nq::field.description>{{ $s['snapshotNameHint'] }}</x-nq::field.description>
                        </x-nq::field>
                        <x-nq::dialog.footer>
                            <x-nq::button type="button" variant="ghost" x-bind:disabled="snapSaving" x-on:click="closeSnapshot()">{{ $s['cancel'] }}</x-nq::button>
                            <x-nq::button type="submit" variant="primary" x-bind:disabled="snapSaving" x-bind:aria-busy="snapSaving ? 'true' : null">
                                <x-nq::spinner x-show="snapSaving" style="display: none" />
                                {{ $s['snapshotCreate'] }}
                            </x-nq::button>
                        </x-nq::dialog.footer>
                    </form>
                </x-nq::dialog.content>
            </x-nq::dialog>
        @endif

        @if ($canEditLimits)
            <x-nq::dialog x-model="limitsOpen">
                <x-nq::dialog.content>
                    <form data-slot="server-limits" class="grid gap-4" novalidate x-on:submit.prevent="submitLimits()">
                        <x-nq::dialog.header>
                            <x-nq::dialog.title>{{ $s['limits'] }}</x-nq::dialog.title>
                            <x-nq::dialog.description>{{ $s['limitsBody'] }}</x-nq::dialog.description>
                        </x-nq::dialog.header>
                        @foreach (['cpuCores', 'memoryMb', 'diskGb'] as $key)
                            <x-nq::field>
                                <x-nq::field.label>{{ $s['limitFields'][$key] }}</x-nq::field.label>
                                <x-nq::field.input x-model="limitsRaw.{{ $key }}" ltr inputmode="numeric" x-bind:data-invalid="limitInvalid('{{ $key }}') ? '' : null" x-bind:aria-invalid="limitInvalid('{{ $key }}') ? 'true' : null" />
                                <div data-slot="field-error" role="alert" class="text-caption text-nq-danger-text" x-show="limitInvalid('{{ $key }}')" style="display: none" x-text="limitError('{{ $key }}')"></div>
                            </x-nq::field>
                        @endforeach
                        <x-nq::dialog.footer>
                            <x-nq::button type="button" variant="ghost" x-bind:disabled="limitsSaving" x-on:click="closeLimits()">{{ $s['cancel'] }}</x-nq::button>
                            <x-nq::button type="submit" variant="primary" x-bind:disabled="limitsSaving" x-bind:aria-busy="limitsSaving ? 'true' : null">
                                <x-nq::spinner x-show="limitsSaving" style="display: none" />
                                {{ $s['limitsSave'] }}
                            </x-nq::button>
                        </x-nq::dialog.footer>
                    </form>
                </x-nq::dialog.content>
            </x-nq::dialog>
        @endif
    </div>
@endif

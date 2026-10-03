{{-- <x-nq::uptime-monitors :monitors="$monitors" :incidents="$incidents" @save="$event.detail.wait(…)" @delete="…" @pause="…" @resume="…" @check="…" />
     The admin side of uptime: a table of monitors with status, a recent-checks summary, the uptime for 24 hours, 7 days or 30 days (switch the period above the table), response time and last check, plus the incidents they raised.
     monitors: [['id', 'name', 'target', 'kind' => http | tcp | ping | keyword, 'status' => up | degraded | down | paused | unknown, 'uptime' => ['24h' => 100, '7d' => 99.9, '30d' => 99.97 | null],
       'checks' => ['up', 'degraded', 'down', 'none'], 'responseMs', 'lastCheckAt' => DateTime | ISO string | unix seconds, 'intervalSec']]. incidents: see <x-nq::uptime-monitors.incident-list>.
     default-period ('30d'). add, check, pause, edit, delete (all true): which controls to show.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       save    detail.input { name, target, kind, intervalSec } and detail.id when editing; resolve, or resolve { error } shown in the dialog; a new monitor may resolve { id, status, uptime, … }
       delete  detail.id (after the confirm);  pause / resume / check  detail.id;  resolve, or resolve { error } shown above the table; resolve a monitor patch to update the row
     After success the card updates its own list. A rejected promise, or nobody listening, shows a generic error. The incidents are rendered once and do not change with the events.
     Differences from the React component: the recent-checks strip and the uptime badge are text in the table (use <x-nq::uptime-monitors.uptime-bar> and <x-nq::uptime-monitors.uptime-badge> on their own), the table header does not
     name the period (the switch above it does), Pause, Resume and Check now show in the row menu (and the row's context menu) only when they apply (Check now and Pause not on a paused monitor, Resume only on one),
     the table's own search is used and its columns do not hide per breakpoint. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['monitors' => [], 'incidents' => [], 'defaultPeriod' => '30d', 'add' => true, 'check' => true, 'pause' => true, 'edit' => true, 'delete' => true])
@php
    $t = \Nasaq\Nasaq::class;
    $carbon = function ($v) {
        if ($v === null || $v === '') return null;
        return $v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v));
    };
    $list = collect($monitors)->map(fn ($m) => array_filter([
        'id' => (string) $m['id'], 'name' => $m['name'], 'target' => $m['target'], 'kind' => $m['kind'] ?? 'http', 'status' => $m['status'] ?? 'unknown',
        'uptime' => (object) ($m['uptime'] ?? []), 'checks' => $m['checks'] ?? null, 'responseMs' => $m['responseMs'] ?? null,
        'lastCheckAt' => ($v = $carbon($m['lastCheckAt'] ?? null)) ? $v->toIso8601String() : null, 'intervalSec' => $m['intervalSec'] ?? null,
    ], fn ($v) => $v !== null))->values()->all();
    $statuses = ['up' => $t::t('Up', 'يعمل'), 'degraded' => $t::t('Slow', 'بطيء'), 'down' => $t::t('Down', 'متوقف'), 'paused' => $t::t('Paused', 'موقوف مؤقتًا'), 'unknown' => $t::t('No data', 'لا بيانات')];
    $tones = ['up' => 'success', 'degraded' => 'warning', 'down' => 'danger', 'paused' => 'neutral', 'unknown' => 'neutral'];
    $kinds = ['http' => 'HTTP', 'tcp' => $t::t('TCP port', 'منفذ TCP'), 'ping' => 'Ping', 'keyword' => $t::t('Keyword', 'كلمة مفتاحية')];
    $intervals = [30 => $t::t('30 seconds', '30 ثانية'), 60 => $t::t('1 minute', 'دقيقة'), 300 => $t::t('5 minutes', '5 دقائق'), 900 => $t::t('15 minutes', '15 دقيقة')];
    $periods = ['24h' => [$t::t('24 hours', '24 ساعة'), $t::t('24h', '24س')], '7d' => [$t::t('7 days', '7 أيام'), $t::t('7d', '7أ')], '30d' => [$t::t('30 days', '30 يومًا'), $t::t('30d', '30ي')]];
    $openCount = collect($incidents)->filter(fn ($i) => ($i['status'] ?? '') !== 'resolved')->count();
    $config = [
        'monitors' => $list,
        'period' => array_key_exists($defaultPeriod, $periods) ? $defaultPeriod : '30d',
        'labels' => [
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
            'deleteTitle' => $t::t('Delete {name}?', 'حذف {name}؟'),
            'history' => $t::t('{up} of {total} checks up', '{up} من {total} فحوص ناجحة'),
            'dialogNew' => $t::t('New monitor', 'مراقب جديد'), 'dialogEdit' => $t::t('Edit monitor', 'تعديل المراقب'),
            'overall' => [
                'operational' => $t::t('All systems operational', 'كل الأنظمة تعمل'), 'degraded' => $t::t('Degraded performance', 'أداء متدهور'),
                'partial-outage' => $t::t('Partial outage', 'انقطاع جزئي'), 'major-outage' => $t::t('Major outage', 'انقطاع كبير'), 'maintenance' => $t::t('Maintenance in progress', 'صيانة جارية'),
            ],
        ],
    ];
    $columns = [
        ['id' => 'name', 'header' => $t::t('Monitor', 'المراقب'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'target', 'header' => $t::t('Address', 'العنوان'), 'searchable' => true],
        ['id' => 'status', 'header' => $t::t('Status', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => array_map(fn ($k) => ['value' => $k, 'label' => $statuses[$k], 'tone' => $tones[$k]], array_keys($statuses))],
        ['id' => 'history', 'header' => $t::t('Recent checks', 'آخر الفحوص')],
        ['id' => 'uptime', 'header' => $t::t('Uptime', 'وقت التشغيل'), 'align' => 'end'],
        ['id' => 'response', 'header' => $t::t('Response', 'الاستجابة'), 'align' => 'end'],
        ['id' => 'checked', 'header' => $t::t('Last check', 'آخر فحص'), 'type' => 'date', 'sortable' => true],
    ];
    $actions = array_values(array_filter([
        $check ? ['id' => 'check', 'label' => $t::t('Check now', 'افحص الآن'), 'icon' => 'refresh-cw', 'group' => 'run', 'visibleWhen' => ['field' => 'status', 'ne' => 'paused']] : null,
        $pause ? ['id' => 'resume', 'label' => $t::t('Resume', 'استئناف'), 'icon' => 'play', 'group' => 'run', 'visibleWhen' => ['field' => 'status', 'eq' => 'paused']] : null,
        $pause ? ['id' => 'pause', 'label' => $t::t('Pause', 'إيقاف مؤقت'), 'icon' => 'circle-pause', 'group' => 'run', 'visibleWhen' => ['field' => 'status', 'ne' => 'paused']] : null,
        $edit ? ['id' => 'edit', 'label' => $t::t('Edit', 'تعديل'), 'icon' => 'pencil', 'group' => 'edit'] : null,
        $delete ? ['id' => 'delete', 'label' => $t::t('Delete', 'حذف'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
    $rows = collect($list)->map(function ($m) use ($config) {
        $measured = array_values(array_filter($m['checks'] ?? [], fn ($c) => $c !== 'none'));
        $up = count(array_filter($measured, fn ($c) => $c !== 'down'));
        $p = ((array) $m['uptime'])[$config['period']] ?? null;
        $cut = $p === null ? null : floor(max(0.0, min(100.0, (float) $p)) * 100 + 1e-9) / 100;
        $ms = $m['responseMs'] ?? null;
        return [
            'id' => $m['id'], 'name' => $m['name'], 'target' => $m['target'], 'status' => $m['status'],
            'history' => $measured ? str_replace(['{up}', '{total}'], [(string) $up, (string) count($measured)], $config['labels']['history']) : '–',
            'uptime' => $cut === null ? '–' : ($cut == 100 ? '100%' : number_format($cut, 2, '.', '').'%'),
            'response' => $ms === null ? '–' : ($ms >= 1000 ? number_format($ms / 1000, 1, '.', '').' s' : round($ms).' ms'),
            'checked' => isset($m['lastCheckAt']) ? substr($m['lastCheckAt'], 0, 10) : null,
        ];
    })->all();
@endphp
{{-- The card's classes, copied from card.blade.php, so data-slot can be uptime-monitors. --}}
<div data-slot="{{ $attributes->get('data-slot', 'uptime-monitors') }}" x-data="nqUptimeMonitors(@js($config))"
    x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
    <x-nq::card.header>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::card.title as="h3" class="flex items-center gap-2">
                <x-lucide-activity aria-hidden="true" class="size-4 text-muted-foreground" />
                {{ $t::t('Uptime monitors', 'مراقبة التشغيل') }}
            </x-nq::card.title>
            <x-nq::badge variant="success" x-show="overallTone === 'success'" style="display: none"><span x-text="overallText"></span></x-nq::badge>
            <x-nq::badge variant="warning" x-show="overallTone === 'warning'" style="display: none"><span x-text="overallText"></span></x-nq::badge>
            <x-nq::badge variant="danger" x-show="overallTone === 'danger'" style="display: none"><span x-text="overallText"></span></x-nq::badge>
        </div>
        <x-nq::card.description>{{ $t::t('Checks that run against your sites and services, and the incidents they raise.', 'فحوص تعمل على مواقعك وخدماتك، والحوادث التي تنتج عنها.') }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="grid gap-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::toggle-group :default-value="[$config['period']]" aria-label="{{ $t::t('Period', 'الفترة') }}" x-model="periodSel">
                @foreach ($periods as $key => [$long, $short])
                    <x-nq::toggle-group.toggle :value="$key" aria-label="{{ $long }}"><bdi>{{ $short }}</bdi></x-nq::toggle-group.toggle>
                @endforeach
            </x-nq::toggle-group>
            @if ($add)
                <x-nq::button type="button" variant="primary" size="sm" x-on:click="openAdd()">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $t::t('Add monitor', 'إضافة مراقب') }}
                </x-nq::button>
            @endif
        </div>
        <template x-if="notice">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$t::t('Monitors', 'المراقبون')" name-key="name" :view-options="false"
            :search="$t::t('Search monitors', 'بحث في المراقبين')" :columns="$columns" :rows="$rows" :row-actions="$actions"
            :labels="['empty' => $t::t('No monitors yet. Add one to start checking a site.', 'لا يوجد مراقبون بعد. أضف واحدًا لبدء فحص موقع.')]" />
        <section aria-labelledby="uptime-incidents" class="grid gap-3">
            <h4 id="uptime-incidents" class="flex items-center gap-2 text-label text-foreground">
                {{ $t::t('Incidents', 'الحوادث') }}
                @if ($openCount)
                    <x-nq::badge variant="warning"><x-nq::numeric :value="$openCount" /> {{ $t::t('Open', 'مفتوحة') }}</x-nq::badge>
                @endif
            </h4>
            <x-nq::uptime-monitors.incident-list :incidents="$incidents" />
        </section>
    </x-nq::card.content>

    @if ($add || $edit)
        <x-nq::dialog x-model="formOpen">
            <x-nq::dialog.content data-slot="monitor-dialog">
                <form novalidate data-slot="monitor-form" class="grid gap-4" x-on:submit.prevent="submit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="dialogTitle"></span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t::t('Checks the address at a fixed interval and raises an incident after failures in a row.', 'يفحص العنوان بفاصل ثابت ويرفع حادثة بعد عدة إخفاقات متتالية.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <template x-if="formError"><x-nq::alert tone="danger"><span x-text="formError"></span></x-nq::alert></template>
                    <x-nq::field x-model="nameInvalid">
                        <x-nq::field.label>{{ $t::t('Name', 'الاسم') }}</x-nq::field.label>
                        <x-nq::field.input x-model="name" x-on:input="onInput()" dir="auto" autocomplete="off" />
                        <x-nq::field.error>{{ $t::t('This field is required.', 'هذا الحقل مطلوب.') }}</x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field x-model="targetInvalid">
                        <x-nq::field.label>{{ $t::t('Address', 'العنوان') }}</x-nq::field.label>
                        <x-nq::field.input x-model="target" x-on:input="onInput()" ltr placeholder="https://example.com/health" autocomplete="off" />
                        <x-nq::field.description>{{ $t::t('A URL for HTTP and keyword monitors, or host:port for TCP.', 'رابط لمراقبات HTTP والكلمات المفتاحية، أو host:port لمراقبة TCP.') }}</x-nq::field.description>
                        <x-nq::field.error>{{ $t::t('This field is required.', 'هذا الحقل مطلوب.') }}</x-nq::field.error>
                    </x-nq::field>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field>
                            <x-nq::field.label>{{ $t::t('Type', 'النوع') }}</x-nq::field.label>
                            <x-nq::select value="http" x-model="kind">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($kinds as $k => $label)
                                        <x-nq::select.item :value="$k">{{ $label }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $t::t('Check every', 'الفحص كل') }}</x-nq::field.label>
                            <x-nq::select value="60" x-model="interval">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($intervals as $k => $label)
                                        <x-nq::select.item :value="(string) $k">{{ $label }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="formOpen = false" x-bind:disabled="pending ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="pending ? 'true' : null" x-bind:data-disabled="pending ? '' : null">
                            <x-nq::spinner x-show="pending" style="display: none" />
                            {{ $t::t('Save monitor', 'حفظ المراقب') }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($delete)
        <x-nq::alert-dialog x-model="deleteOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="deleteTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $t::t('Checks stop and its uptime history is removed.', 'تتوقف الفحوص ويُحذف سجل وقت التشغيل.') }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="confirmDelete()">{{ $t::t('Delete', 'حذف') }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>

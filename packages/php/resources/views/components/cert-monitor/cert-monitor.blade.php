{{-- <x-nq::cert-monitor :certificates="$certs" @add="$event.detail.wait(…)" @recheck="$event.detail.wait(…)" @renew="$event.detail.wait(…)" @remove="$event.detail.wait(…)" />
     Watch TLS certificates so none lapses unnoticed: a table of hosts with issuer, expiry date, auto renew and a days-left figure, soonest expiry first, with check again, renew now and stop monitoring (with a confirm).
     certificates: [['id', 'host', 'issuer', 'validTo' => DateTime | ISO string | unix seconds, 'autoRenew' => false, 'error' => 'set when the last check failed']].
     now: override the clock (DateTime | ISO string | unix seconds; default now). warn-days (30) and critical-days (7): the thresholds for amber and red.
     add, recheck, renew, remove (all true): which controls to show. Renew now is in the menu of manual (not auto-renewing) certificates only, as in React.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       add      detail.host (lower-cased); resolve, or resolve { error } shown above the table; a new certificate may resolve { id, issuer, validTo, autoRenew }
       recheck  detail.id; resolve, or resolve { error }; resolve { validTo, issuer, autoRenew } to update the row
       renew    detail.id; resolve, or resolve { error }; resolve { validTo } to update the row
       remove   detail.id (after the confirm); resolve, or resolve { error }
     After success the card updates its own list. A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the days left and the status are two text columns instead of one badge (use <x-nq::cert-monitor.days-left-badge> for the badge on its own), the host is not set in
     monospace, the error text of a failed check is not shown in the Expires column, the date column shows a date and cannot hide per breakpoint, the search box is the table's own, and
     the "Days left" figures are worked out from the clock at render time. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['certificates' => [], 'now' => null, 'warnDays' => 30, 'criticalDays' => 7, 'add' => true, 'recheck' => true, 'renew' => true, 'remove' => true])
@php
    $t = \Nasaq\Nasaq::class;
    $carbon = function ($v) {
        if ($v === null || $v === '') return null;
        return $v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v));
    };
    $clock = $carbon($now) ?? \Carbon\Carbon::now();
    $list = collect($certificates)->map(fn ($c) => array_filter([
        'id' => (string) $c['id'], 'host' => $c['host'], 'issuer' => $c['issuer'] ?? null,
        'validTo' => ($v = $carbon($c['validTo'] ?? null)) ? $v->toIso8601String() : null,
        'autoRenew' => ! empty($c['autoRenew']), 'error' => $c['error'] ?? null,
    ], fn ($v) => $v !== null))->values()->all();
    $statuses = [
        'valid' => $t::t('Valid', 'صالحة'), 'expiring' => $t::t('Expiring soon', 'تنتهي قريبًا'), 'critical' => $t::t('Expires very soon', 'تنتهي خلال أيام'),
        'expired' => $t::t('Expired', 'منتهية'), 'error' => $t::t('Check failed', 'فشل الفحص'),
    ];
    $tones = ['valid' => 'success', 'expiring' => 'warning', 'critical' => 'danger', 'expired' => 'danger', 'error' => 'neutral'];
    $config = [
        'certificates' => $list,
        'now' => $clock->toIso8601String(),
        'thresholds' => ['warnDays' => (int) $warnDays, 'criticalDays' => (int) $criticalDays],
        'labels' => [
            'invalid' => $t::t('Enter a hostname like app.example.com.', 'أدخل اسم مضيف مثل app.example.com.'),
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
            'summary' => $t::t('{total} monitored, {attention} need attention', '{total} مراقبة، {attention} تحتاج انتباهًا'),
            'removeTitle' => $t::t('Stop monitoring {host}?', 'إيقاف مراقبة {host}؟'),
            'unknown' => $t::t('Unknown', 'غير معروف'), 'today' => $t::t('Today', 'اليوم'),
            'expiredAgo' => $t::t('Expired {n} d ago', 'منتهية منذ {n} ي'), 'daysLeft' => $t::t('{n} d', '{n} ي'),
            'autoRenew' => $t::t('Auto renew', 'تجديد تلقائي'), 'manual' => $t::t('Manual', 'يدوي'),
        ],
    ];
    $columns = [
        ['id' => 'host', 'header' => $t::t('Host', 'المضيف'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'issuer', 'header' => $t::t('Issuer', 'الجهة المصدرة'), 'sortable' => true, 'searchable' => true],
        ['id' => 'expires', 'header' => $t::t('Expires', 'تنتهي'), 'type' => 'date', 'sortable' => true],
        ['id' => 'renew', 'header' => $t::t('Auto renew', 'تجديد تلقائي')],
        ['id' => 'left', 'header' => $t::t('Days left', 'الأيام المتبقية'), 'sortable' => true, 'align' => 'end'],
        ['id' => 'status', 'header' => $t::t('Status', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => array_map(fn ($k) => ['value' => $k, 'label' => $statuses[$k], 'tone' => $tones[$k]], array_keys($statuses))],
    ];
    $actions = array_values(array_filter([
        $recheck ? ['id' => 'recheck', 'label' => $t::t('Check again', 'افحص مجددًا'), 'icon' => 'refresh-cw', 'group' => 'run'] : null,
        $renew ? ['id' => 'renew', 'label' => $t::t('Renew now', 'جدّد الآن'), 'icon' => 'shield-check', 'group' => 'run', 'visibleWhen' => ['field' => 'renew', 'eq' => $config['labels']['manual']]] : null,
        $remove ? ['id' => 'remove', 'label' => $t::t('Stop monitoring', 'إيقاف المراقبة'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
    $th = ['warn' => (int) $warnDays, 'critical' => (int) $criticalDays];
    $rows = collect($list)->map(function ($c) use ($clock, $th, $carbon, $config) {
        $v = ! empty($c['error']) ? null : $carbon($c['validTo'] ?? null);
        $d = $v ? (int) floor(($v->getTimestamp() - $clock->getTimestamp()) / 86400) : null;
        $s = $d === null ? 'error' : ($d < 0 ? 'expired' : ($d <= $th['critical'] ? 'critical' : ($d <= $th['warn'] ? 'expiring' : 'valid')));
        $l = $config['labels'];
        $left = $d === null ? $l['unknown'] : ($d < 0 ? str_replace('{n}', (string) -$d, $l['expiredAgo']) : ($d === 0 ? $l['today'] : str_replace('{n}', (string) $d, $l['daysLeft'])));
        return ['id' => $c['id'], 'host' => $c['host'], 'issuer' => $c['issuer'] ?? null, 'expires' => $v ? $v->format('Y-m-d') : null,
            'renew' => ! empty($c['autoRenew']) ? $l['autoRenew'] : $l['manual'], 'left' => $left, 'status' => $s, 'days' => $d];
    })->sortBy(fn ($r) => $r['days'] ?? PHP_INT_MAX)->values()->map(fn ($r) => array_diff_key($r, ['days' => 1]))->all();
@endphp
{{-- The card's classes, copied from card.blade.php, so data-slot can be certificate-monitor. --}}
<div data-slot="{{ $attributes->get('data-slot', 'certificate-monitor') }}" x-data="nqCertMonitor(@js($config))"
    x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
    <x-nq::card.header>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::card.title as="h3" class="flex items-center gap-2">
                <x-lucide-shield-check aria-hidden="true" class="size-4 text-muted-foreground" />
                {{ $t::t('TLS certificates', 'شهادات TLS') }}
            </x-nq::card.title>
            <x-nq::badge variant="success" x-show="! attention" style="display: none"><span x-text="summaryText"></span></x-nq::badge>
            <x-nq::badge variant="warning" x-show="attention" style="display: none"><span x-text="summaryText"></span></x-nq::badge>
        </div>
        <x-nq::card.description>{{ $t::t('When each certificate expires, so none lapses unnoticed.', 'موعد انتهاء كل شهادة، حتى لا تنتهي دون أن يلاحظ أحد.') }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="grid gap-4">
        @if ($add)
            <form novalidate class="flex items-start gap-2" data-slot="certificate-add" x-on:submit.prevent="submit()">
                <x-nq::field x-model="fieldInvalid">
                    <x-nq::field.label class="sr-only">{{ $t::t('Host to monitor', 'المضيف المراد مراقبته') }}</x-nq::field.label>
                    <x-nq::field.input x-model="value" x-on:input="onInput()" ltr placeholder="app.example.com" autocomplete="off" aria-label="{{ $t::t('Host to monitor', 'المضيف المراد مراقبته') }}" />
                    <x-nq::field.error><span x-text="error"></span></x-nq::field.error>
                </x-nq::field>
                <x-nq::button type="submit" variant="primary" x-bind:aria-busy="adding ? 'true' : null" x-bind:data-disabled="adding ? '' : null">
                    <x-nq::spinner x-show="adding" style="display: none" />
                    <x-lucide-plus aria-hidden="true" x-show="! adding" />
                    {{ $t::t('Add host', 'إضافة مضيف') }}
                </x-nq::button>
            </form>
        @endif
        <template x-if="notice">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$t::t('Certificates', 'الشهادات')" name-key="host" :view-options="false"
            :columns="$columns" :rows="$rows" :row-actions="$actions"
            :labels="['search' => $t::t('Search hosts', 'بحث في المضيفين'), 'empty' => $t::t('No certificates monitored yet. Add a host to check its TLS certificate.', 'لا توجد شهادات مراقبة بعد. أضف مضيفًا لفحص شهادة TLS الخاصة به.')]" />
    </x-nq::card.content>

    @if ($remove)
        <x-nq::alert-dialog x-model="removeOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="removeTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $t::t('The certificate itself is not touched. You just stop getting alerts about it.', 'لا تتأثر الشهادة نفسها. فقط تتوقف التنبيهات الخاصة بها.') }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="confirmRemove()">{{ $t::t('Stop monitoring', 'إيقاف المراقبة') }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>

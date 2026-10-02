{{-- <x-nq::audit-log :entries="[['id' => 'a1', 'at' => '2026-03-10T09:12:00Z', 'actor' => ['id' => 'u1', 'name' => 'Sara Alharbi', 'email' => 'sara@example.com'], 'action' => 'member.role_changed', 'entity' => ['type' => 'member', 'label' => 'Omar Khalid'], 'channel' => 'web', 'changes' => [['field' => 'role', 'before' => 'member', 'after' => 'admin']]]]" />
     The audit log: who did what, to which entity, from where (web, API or MCP) and when. Search, filter by actor, action, entity, channel and dates, sort, page, and open a row for the field-level before and after.
     entries: ['id', 'at' => ISO string | DateTime | ms, 'actor' => ['id', 'name', 'email'?, 'avatar'?] | null (the system), 'action' => id, 'entity' => ['type', 'id'?, 'label'?], 'channel' => web | api | mcp, 'ip'?, 'changes' => [['field', 'before'?, 'after'?]]?].
     action-labels / entity-labels: friendly names keyed by id, for example ['member.role_changed' => 'Role changed']. page-size: rows per page (10, 0 = all). refresh: show a Refresh button.
     retention: ['days' => 90 | null, 'options' => [30, 90, 180, 365, 730, null]?, 'editable' => true?] shows the retention setting. labels: override any string by its key.
     Events (bubbling): nq-audit-retention { days, wait(promise) } (a promise that rejects or resolves { error } rolls the select back), nq-audit-refresh { wait(promise) }.
     Replace the entries later: el.dispatchEvent(new CustomEvent('nq-audit-set', { detail: { entries: [...] } })).
     Differences from the React AuditLog: the entries are fixed at render (send nq-audit-set to change them); the details dialog content keeps data-slot="dialog-content" (an inner wrapper carries data-slot="audit-log-details"); the changes table is a div role="table" (rows carry data-kind), not a <table>.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['entries' => [], 'actionLabels' => [], 'entityLabels' => [], 'pageSize' => 10, 'refresh' => false, 'retention' => null, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $loc = $locale ?? ($ar ? 'ar' : 'en');
    $t = fn (string $en, string $ar2) => \Nasaq\Nasaq::t($en, $ar2);
    $num = function ($n) use ($loc) {
        return class_exists('NumberFormatter') ? (new \NumberFormatter($loc, \NumberFormatter::DECIMAL))->format($n) : (string) $n;
    };
    $s = array_merge([
        'table' => $t('Audit log', 'سجل التدقيق'),
        'search' => $t('Search actor, action or entity', 'ابحث بالمنفّذ أو الإجراء أو الكيان'),
        'actor' => $t('Actor', 'المنفّذ'), 'action' => $t('Action', 'الإجراء'), 'entity' => $t('Entity', 'الكيان'), 'channel' => $t('Channel', 'القناة'),
        'when' => $t('When', 'الوقت'), 'system' => $t('System', 'النظام'), 'ip' => $t('IP address', 'عنوان IP'),
        'dates' => $t('Dates', 'التواريخ'), 'datePlaceholder' => $t('Any date', 'أي تاريخ'), 'clearDates' => $t('Clear dates', 'مسح التواريخ'),
        'channel_web' => $t('Web', 'الويب'), 'channel_api' => $t('API', 'واجهة API'), 'channel_mcp' => 'MCP',
        'empty' => $t('No activity yet', 'لا يوجد نشاط بعد'), 'emptyHint' => $t('Actions taken in this workspace will appear here.', 'ستظهر هنا الإجراءات التي تتم في مساحة العمل هذه.'),
        'noMatch' => $t('No matching results', 'لا نتائج مطابقة'), 'noMatchHint' => $t('Try a different search or clear the filters.', 'جرّب بحثًا آخر أو امسح عوامل التصفية.'),
        'clearFilters' => $t('Clear filters', 'مسح التصفية'), 'reset' => $t('Reset', 'إعادة الضبط'),
        'refresh' => $t('Refresh', 'تحديث'), 'view' => $t('View', 'العرض'), 'columns' => $t('Columns', 'الأعمدة'), 'clearSearch' => $t('Clear search', 'مسح البحث'),
        'details' => $t('Details', 'التفاصيل'), 'changes' => $t('Changes', 'التغييرات'),
        'noChanges' => $t('No field changes were recorded for this action.', 'لم تُسجَّل تغييرات في الحقول لهذا الإجراء.'),
        'field' => $t('Field', 'الحقل'), 'before' => $t('Before', 'قبل'), 'after' => $t('After', 'بعد'),
        'added' => $t('Added', 'أُضيف'), 'removed' => $t('Removed', 'أُزيل'), 'changed' => $t('Changed', 'تغيّر'), 'empty_value' => $t('empty', 'فارغ'),
        'fieldOne' => $t('1 field', 'حقل واحد'), 'fieldMany' => $t('{n} fields', '{n} حقول'),
        'range' => $t('{from}–{to} of {total}', '{from}–{to} من {total}'), 'announce' => $t('{n} entries', '{n} سجلات'),
        'previous' => $t('Previous page', 'الصفحة السابقة'), 'next' => $t('Next page', 'الصفحة التالية'), 'pagination' => $t('Pagination', 'التنقل بين الصفحات'),
        'retention' => $t('Retention', 'مدة الاحتفاظ'), 'retentionHint' => $t('How long entries are kept before they are deleted for good.', 'المدة التي تُحفظ فيها السجلات قبل حذفها نهائيًا.'),
        'retentionAria' => $t('Retention period', 'مدة الاحتفاظ'), 'forever' => $t('Keep forever', 'الاحتفاظ دائمًا'),
        'expiringOne' => $t('1 entry is older than this and will be deleted.', 'سجل واحد أقدم من ذلك وسيُحذف.'),
        'expiringMany' => $t('{n} entries are older than this and will be deleted.', '{n} سجلات أقدم من ذلك وستُحذف.'),
        'retentionSaved' => $t('Retention updated.', 'تم تحديث مدة الاحتفاظ.'), 'retentionFailed' => $t('Retention could not be changed. Try again.', 'تعذّر تغيير مدة الاحتفاظ. حاول مرة أخرى.'),
        'close' => $t('Close', 'إغلاق'),
    ], (array) $labels);

    $list = array_values(array_map(function ($e) {
        $e = (array) $e;
        if ($e['at'] instanceof \DateTimeInterface) {
            $e['at'] = $e['at']->format(DATE_ATOM);
        }
        $e['actor'] = isset($e['actor']) ? (array) $e['actor'] : null;
        $e['entity'] = (array) $e['entity'];
        $e['changes'] = array_values(array_map(fn ($c) => (array) $c, (array) ($e['changes'] ?? [])));
        return $e;
    }, (array) $entries));

    $actors = [];
    foreach ($list as $e) {
        $actors[$e['actor']['id'] ?? 'system'] ??= $e['actor']['name'] ?? $s['system'];
    }
    $actions = collect($list)->pluck('action')->unique()->sort()->values()->all();
    $entities = collect($list)->map(fn ($e) => $e['entity']['type'])->unique()->sort()->values()->all();
    $facets = [
        'actor' => ['title' => $s['actor'], 'options' => collect($actors)->map(fn ($label, $v) => ['value' => (string) $v, 'label' => $label])->values()->all()],
        'action' => ['title' => $s['action'], 'options' => array_map(fn ($v) => ['value' => $v, 'label' => ((array) $actionLabels)[$v] ?? $v], $actions)],
        'entity' => ['title' => $s['entity'], 'options' => array_map(fn ($v) => ['value' => $v, 'label' => ((array) $entityLabels)[$v] ?? $v], $entities)],
        'channel' => ['title' => $s['channel'], 'options' => array_map(fn ($v) => ['value' => $v, 'label' => $s['channel_'.$v]], ['web', 'api', 'mcp'])],
    ];
    $q = fn ($v) => str_replace(['\\', "'"], ['\\\\', "\\'"], (string) $v);

    $ret = $retention ? (array) $retention : null;
    $retOptions = $ret ? ($ret['options'] ?? [30, 90, 180, 365, 730, null]) : [];
    $retLabel = fn ($d) => $d === null ? $s['forever'] : ($d === 365 ? $t('1 year', 'سنة واحدة') : ($d % 365 === 0 ? $num($d / 365).' '.$t('years', 'سنوات') : $num($d).' '.$t('days', 'يومًا')));

    $sortable = ['when', 'actor', 'action', 'entity', 'channel'];
    $hide = 'style="display: none"';
    $btn = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-card text-foreground font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-control-sm px-2.5';
    $ghost = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control text-foreground font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus h-control-sm px-2.5';
    $cfg = [
        'entries' => $list,
        'actionLabels' => (object) (array) $actionLabels,
        'entityLabels' => (object) (array) $entityLabels,
        'pageSize' => (int) $pageSize,
        'locale' => $loc,
        'retention' => $ret ? ['days' => $ret['days'] ?? null, 'editable' => $ret['editable'] ?? true] : null,
        'strings' => $s,
    ];
    $head = 'flex items-center h-row px-4 py-3 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground';
    $cell = 'flex items-center h-row px-4 py-3 align-middle whitespace-nowrap';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'audit-log') }}" x-data="nqAuditLog({!! \Illuminate\Support\Js::from($cfg) !!})"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div data-slot="data-table-toolbar" class="flex flex-wrap items-center gap-2">
        <div data-slot="data-table-search" class="relative w-full sm:w-64">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <x-nq::field.input type="search" x-model="query" x-on:keydown.escape="if (query) { $event.preventDefault(); query = '' }" placeholder="{{ $s['search'] }}" aria-label="{{ $s['search'] }}"
                class="h-control-sm ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden" />
            <button type="button" x-show="query" aria-label="{{ $s['clearSearch'] }}" x-on:click="query = ''" {!! $hide !!}
                class="absolute end-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                <x-lucide-x aria-hidden="true" class="size-3.5" />
            </button>
        </div>

        @foreach ($facets as $id => $f)
            <x-nq::dropdown-menu>
                <x-nq::dropdown-menu.trigger size="sm" x-bind:class="facetCount('{{ $id }}') ? '' : 'border-dashed text-muted-foreground'" data-facet="{{ $id }}">
                    <x-lucide-list-filter aria-hidden="true" />
                    {{ $f['title'] }}
                    <span data-slot="badge" x-show="facetCount('{{ $id }}')" x-text="facetCount('{{ $id }}')" {!! $hide !!}
                        class="-me-1 inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border px-1.5 text-caption font-medium tabular-nums text-muted-foreground"></span>
                </x-nq::dropdown-menu.trigger>
                <x-nq::dropdown-menu.content class="min-w-48">
                    <x-nq::dropdown-menu.group>
                        @foreach ($f['options'] as $o)
                            <x-nq::dropdown-menu.checkbox-item x-model="facet['{{ $id }}|{{ $q($o['value']) }}']">{{ $o['label'] }}</x-nq::dropdown-menu.checkbox-item>
                        @endforeach
                    </x-nq::dropdown-menu.group>
                    <div x-show="facetCount('{{ $id }}')" {!! $hide !!}>
                        <x-nq::dropdown-menu.separator />
                        <x-nq::dropdown-menu.item x-on:click="resetFacet('{{ $id }}')">{{ $s['reset'] }}</x-nq::dropdown-menu.item>
                    </div>
                </x-nq::dropdown-menu.content>
            </x-nq::dropdown-menu>
        @endforeach

        <x-nq::date-picker.range x-model="range" :placeholder="$s['datePlaceholder']" aria-label="{{ $s['dates'] }}" class="w-56" />
        <button type="button" x-show="hasDates" x-on:click="clearDates()" {!! $hide !!} class="{{ $ghost }}">{{ $s['clearDates'] }}</button>

        <x-nq::dropdown-menu>
            <x-nq::dropdown-menu.trigger size="sm" class="{{ $refresh ? '' : 'ms-auto' }}">
                <x-lucide-settings-2 aria-hidden="true" />
                {{ $s['view'] }}
            </x-nq::dropdown-menu.trigger>
            <x-nq::dropdown-menu.content align="end" class="min-w-48">
                <x-nq::dropdown-menu.group>
                    <x-nq::dropdown-menu.label>{{ $s['columns'] }}</x-nq::dropdown-menu.label>
                    @foreach (['actor', 'action', 'entity', 'channel', 'ip'] as $c)
                        <x-nq::dropdown-menu.checkbox-item x-model="shown['{{ $c }}']" x-bind:disabled="lastShown('{{ $c }}') ? '' : null">{{ $s[$c] }}</x-nq::dropdown-menu.checkbox-item>
                    @endforeach
                </x-nq::dropdown-menu.group>
            </x-nq::dropdown-menu.content>
        </x-nq::dropdown-menu>

        @if ($refresh)
            <x-nq::button variant="secondary" size="sm" class="ms-auto" x-on:click="refresh()" x-bind:aria-busy="refreshing ? 'true' : null" data-refresh>
                <x-lucide-refresh-cw aria-hidden="true" x-bind:class="refreshing ? 'animate-spin' : ''" />
                {{ $s['refresh'] }}
            </x-nq::button>
        @endif
    </div>

    <div data-slot="table-container" role="region" tabindex="0" aria-label="{{ $s['table'] }}"
        class="relative w-full overflow-x-auto rounded-card border border-border bg-card outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
        <div data-slot="table" role="table" aria-label="{{ $s['table'] }}" x-bind:style="gridStyle" data-frame class="grid w-full min-w-max text-body-sm [&_[data-slot=table-header]]:bg-secondary/50">
            <div data-slot="table-header" role="rowgroup" class="contents">
                <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-b border-border">
                    @foreach (['when', 'actor', 'action', 'entity', 'channel', 'ip'] as $c)
                        <div role="columnheader" data-slot="table-head" data-col="{{ $c }}" x-show="shown['{{ $c }}']" {!! $c === 'ip' ? $hide : '' !!}
                            @if (in_array($c, $sortable, true)) x-bind:aria-sort="ariaSort('{{ $c }}')" @endif class="{{ $head }}">
                            @if (in_array($c, $sortable, true))
                                <button type="button" x-on:click="toggleSort('{{ $c }}')" x-bind:class="sortOf('{{ $c }}') ? 'text-foreground' : ''"
                                    class="-mx-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                                    <span>{{ $s[$c] }}</span>
                                    <x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5 shrink-0 opacity-40" x-show="! sortOf('{{ $c }}')" />
                                    <x-lucide-arrow-up aria-hidden="true" class="size-3.5 shrink-0" x-show="sortOf('{{ $c }}') === 'asc'" {!! $hide !!} />
                                    <x-lucide-arrow-down aria-hidden="true" class="size-3.5 shrink-0" x-show="sortOf('{{ $c }}') === 'desc'" {!! $hide !!} />
                                </button>
                            @else
                                {{ $s[$c] }}
                            @endif
                        </div>
                    @endforeach
                </div>
            </div>

            <div role="rowgroup" class="contents" data-slot="table-body" x-show="isEmpty" {!! $hide !!}>
                <div role="row" data-slot="table-row" class="col-span-full grid grid-cols-subgrid border-0">
                    <div role="cell" data-slot="table-cell" class="col-span-full h-auto p-0 whitespace-normal">
                        <div x-show="firstRun" {!! $hide !!}>
                            <x-nq::states.empty icon="user-round" :title="$s['empty']" :description="$s['emptyHint']" class="border-0" />
                        </div>
                        <div x-show="noMatch" {!! $hide !!}>
                            <x-nq::states.empty icon="search" :title="$s['noMatch']" :description="$s['noMatchHint']" class="border-0">
                                <button type="button" x-on:click="resetFilters()" class="{{ $btn }}">{{ $s['clearFilters'] }}</button>
                            </x-nq::states.empty>
                        </div>
                    </div>
                </div>
            </div>

            <template x-for="(row, index) in rows" x-bind:key="row.id">
                <div role="rowgroup" class="contents" data-slot="table-body">
                    <div role="row" data-slot="table-row" data-row tabindex="-1" x-bind:tabindex="index === Math.min(active, rows.length - 1) ? 0 : -1" x-bind:aria-label="actionName(row.action)"
                        x-on:focus="if ($event.target === $event.currentTarget) active = index" x-on:keydown="rowKey($event, row, index)" x-on:click="show(row)"
                        class="col-span-full grid grid-cols-subgrid group/row cursor-pointer border-b border-border outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                        <div role="cell" data-slot="table-cell" data-cell-col="when" x-show="shown.when" class="{{ $cell }}">
                            <span class="whitespace-nowrap text-body-sm text-foreground" x-text="time(row)"></span>
                        </div>
                        <div role="cell" data-slot="table-cell" data-cell-col="actor" x-show="shown.actor" class="{{ $cell }}">
                            <template x-if="row.actor">
                                <div class="flex min-w-0 items-center gap-2">
                                    <span data-slot="avatar" class="inline-flex size-6 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary align-middle text-[10px] font-medium text-secondary-foreground">
                                        <img data-slot="avatar-image" x-show="row.actor.avatar" x-bind:src="row.actor.avatar" x-bind:alt="row.actor.name" class="size-full object-cover" style="display: none">
                                        <span data-slot="avatar-fallback" x-show="! row.actor.avatar" role="img" x-bind:aria-label="row.actor.name" class="flex size-full items-center justify-center" x-text="initials(row)"></span>
                                    </span>
                                    <div class="flex min-w-0 flex-col">
                                        <span class="truncate text-label text-foreground" x-text="row.actor.name"></span>
                                        <bdi dir="ltr" x-show="row.actor.email" class="truncate text-caption text-muted-foreground" x-text="row.actor.email"></bdi>
                                    </div>
                                </div>
                            </template>
                            <template x-if="! row.actor">
                                <span class="flex items-center gap-2 text-body-sm text-muted-foreground"><x-lucide-cpu aria-hidden="true" class="size-4" /><span x-text="strings.system"></span></span>
                            </template>
                        </div>
                        <div role="cell" data-slot="table-cell" data-cell-col="action" x-show="shown.action" class="{{ $cell }}">
                            <div class="flex min-w-0 flex-col">
                                <span class="truncate text-label text-foreground" x-text="actionName(row.action)"></span>
                                <bdi dir="ltr" x-show="hasLabel(row)" class="truncate font-mono text-caption text-muted-foreground" x-text="row.action"></bdi>
                            </div>
                        </div>
                        <div role="cell" data-slot="table-cell" data-cell-col="entity" x-show="shown.entity" class="{{ $cell }}">
                            <div class="flex min-w-0 flex-col">
                                <span class="truncate text-body-sm text-foreground" x-text="entityTitle(row)"></span>
                                <span class="truncate text-caption text-muted-foreground" x-text="entityName(row.entity.type)"></span>
                            </div>
                        </div>
                        <div role="cell" data-slot="table-cell" data-cell-col="channel" x-show="shown.channel" class="{{ $cell }}">
                            <span data-slot="badge" class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-border px-1.5 text-caption font-medium text-muted-foreground [&_svg]:size-3">
                                <x-lucide-globe aria-hidden="true" x-show="row.channel === 'web'" {!! $hide !!} />
                                <x-lucide-server aria-hidden="true" x-show="row.channel === 'api'" {!! $hide !!} />
                                <x-lucide-bot aria-hidden="true" x-show="row.channel === 'mcp'" {!! $hide !!} />
                                <span x-text="channelName(row)"></span>
                            </span>
                        </div>
                        <div role="cell" data-slot="table-cell" data-cell-col="ip" x-show="shown.ip" {!! $hide !!} class="{{ $cell }}">
                            <bdi dir="ltr" x-show="row.ip" class="font-mono text-caption" x-text="row.ip"></bdi>
                            <span x-show="! row.ip" class="text-muted-foreground">-</span>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <nav data-slot="data-table-pagination" aria-label="{{ $s['pagination'] }}" x-show="paged" {!! $hide !!} class="flex flex-wrap items-center justify-end gap-2">
        <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite" x-text="rangeText"></span>
        <button type="button" aria-label="{{ $s['previous'] }}" x-bind:disabled="pageBack ? '' : null" x-on:click="setPage(page - 1)"
            class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-left aria-hidden="true" class="rtl:-scale-x-100" /></button>
        <button type="button" aria-label="{{ $s['next'] }}" x-bind:disabled="pageEnd ? '' : null" x-on:click="setPage(page + 1)"
            class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"><x-lucide-chevron-right aria-hidden="true" class="rtl:-scale-x-100" /></button>
    </nav>
    <span role="status" aria-live="polite" class="sr-only" x-text="announce"></span>

    @if ($ret)
        <section data-slot="audit-retention" aria-label="{{ $s['retention'] }}" class="flex flex-col gap-3 rounded-card border border-border p-4">
            <x-nq::field>
                <x-nq::field.label>{{ $s['retention'] }}</x-nq::field.label>
                <x-nq::select x-model="retentionKey">
                    <x-nq::select.trigger aria-label="{{ $s['retentionAria'] }}" class="w-full sm:w-64" x-bind:disabled="retentionLocked ? '' : null">
                        <x-nq::select.value />
                    </x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($retOptions as $d)
                            <x-nq::select.item :value="$d === null ? 'forever' : (string) $d">{{ $retLabel($d) }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
                <x-nq::field.description>{{ $s['retentionHint'] }}</x-nq::field.description>
            </x-nq::field>
            <x-nq::alert tone="warning" x-show="hasExpiring" style="display: none"><span x-text="expiringText"></span></x-nq::alert>
            <template x-if="noticeSuccess"><x-nq::alert tone="success" dismissible><span x-text="notice.text"></span></x-nq::alert></template>
            <template x-if="noticeDanger"><x-nq::alert tone="danger" dismissible><span x-text="notice.text"></span></x-nq::alert></template>
        </section>
    @endif

    <x-nq::dialog x-model="detailsOpen">
        <x-nq::dialog.content class="max-w-2xl" close-label="{{ $s['close'] }}">
            <div data-slot="audit-log-details" class="contents">
                <template x-if="current">
                    <div class="contents">
                        <x-nq::dialog.header>
                            <x-nq::dialog.title x-text="details.title" />
                            <x-nq::dialog.description x-text="details.description" />
                        </x-nq::dialog.header>
                        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-body-sm">
                            <dt class="text-muted-foreground">{{ $s['action'] }}</dt>
                            <dd><bdi dir="ltr" class="font-mono" x-text="details.action"></bdi></dd>
                            <dt class="text-muted-foreground">{{ $s['entity'] }}</dt>
                            <dd><span x-text="details.entity"></span><span class="text-muted-foreground"> · <span x-text="details.entityType"></span></span></dd>
                            <dt class="text-muted-foreground">{{ $s['channel'] }}</dt>
                            <dd x-text="details.channel"></dd>
                            <template x-if="details.ip">
                                <dt class="text-muted-foreground">{{ $s['ip'] }}</dt>
                            </template>
                            <template x-if="details.ip">
                                <dd><bdi dir="ltr" class="font-mono" x-text="details.ip"></bdi></dd>
                            </template>
                        </dl>
                        <section aria-label="{{ $s['changes'] }}" class="flex flex-col gap-2">
                            <h3 class="text-label text-foreground">
                                {{ $s['changes'] }}
                                <span x-show="details.changes.length" class="font-normal text-muted-foreground"> · <span x-text="details.fieldCount"></span></span>
                            </h3>
                            <div x-show="details.changes.length" class="overflow-x-auto rounded-card border border-border">
                                <div role="table" data-slot="audit-changes" aria-label="{{ $s['changes'] }}" class="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] text-body-sm">
                                    <div role="row" class="col-span-full grid grid-cols-subgrid bg-secondary text-start text-caption text-muted-foreground">
                                        <div role="columnheader" class="px-3 py-2 text-start font-medium">{{ $s['field'] }}</div>
                                        <div role="columnheader" class="px-3 py-2 text-start font-medium">{{ $s['before'] }}</div>
                                        <div role="columnheader" class="px-3 py-2 text-start font-medium">{{ $s['after'] }}</div>
                                    </div>
                                    <template x-for="c in details.changes" x-bind:key="c.field">
                                        <div role="row" x-bind:data-kind="c.kind" class="col-span-full grid grid-cols-subgrid items-start border-t border-border">
                                            <div role="rowheader" class="px-3 py-2 text-start font-normal">
                                                <bdi dir="ltr" class="font-mono text-caption text-foreground" x-text="c.field"></bdi>
                                                <span class="mt-0.5 block text-caption text-muted-foreground" x-text="c.kindLabel"></span>
                                            </div>
                                            <div role="cell" class="px-3 py-2">
                                                <span x-show="c.kind === 'added'" class="text-muted-foreground" x-text="strings.empty_value"></span>
                                                <span x-show="c.kind !== 'added'" class="inline-flex items-start gap-1 rounded-[4px] bg-nq-danger-soft px-1.5 py-0.5 text-nq-danger-text">
                                                    <x-lucide-minus aria-hidden="true" class="mt-0.5 size-3 shrink-0" />
                                                    <bdi dir="auto" class="break-all" x-text="c.before || strings.empty_value"></bdi>
                                                </span>
                                            </div>
                                            <div role="cell" class="px-3 py-2">
                                                <span x-show="c.kind === 'removed'" class="text-muted-foreground" x-text="strings.empty_value"></span>
                                                <span x-show="c.kind !== 'removed'" class="inline-flex items-start gap-1 rounded-[4px] bg-nq-success-soft px-1.5 py-0.5 text-nq-success-text">
                                                    <x-lucide-plus aria-hidden="true" class="mt-0.5 size-3 shrink-0" />
                                                    <bdi dir="auto" class="break-all" x-text="c.after || strings.empty_value"></bdi>
                                                </span>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>
                            <p x-show="! details.changes.length" class="text-body-sm text-muted-foreground">{{ $s['noChanges'] }}</p>
                        </section>
                    </div>
                </template>
            </div>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>

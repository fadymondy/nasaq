{{-- <x-nq::feature-flags :flags="$flags" :environments="[['id' => 'dev', 'label' => 'Development'], ['id' => 'prod', 'label' => 'Production']]" @toggle="$event.detail.wait(…)" @open="…" @create="…" @delete="$event.detail.wait(…)" />
     The flag list as a card with a table: the flag name and key, an on/off switch per environment right in the row, the rollout % and the state in one environment, and when it last changed (newest first). A row opens the flag; the row menu (also on right-click) opens it, copies the key and deletes it.
     flags: [['key' => 'new-checkout', 'name' => 'New checkout', 'killed' => false, 'tags' => ['ui'], 'environments' => ['dev' => ['enabled' => true, 'rollout' => 100], 'prod' => ['enabled' => true, 'rollout' => 25]], 'updatedAt' => ISO date, 'updatedBy' => 'Mona']].
     environments: [['id', 'label']] in column order. rollout-environment: the id whose rollout % and state columns show (default: the last one). toggle, open, create, delete (all true): which controls to show; without toggle the environment cells are read-only On/Off.
     title, description, page-size (8), loading, error (a message), labels: array overriding the built-in words.
     It is presentational: it fires events on the root.
       toggle         detail.key, detail.environment, detail.enabled and wait(promise); resolve, or resolve { error }: until it settles the switch shows the new value as pending, an error rolls it back.
       delete         detail.key and wait(promise); resolve, or resolve { error } shown above the table. After a successful delete the row goes.
       open, create   detail.key (create has none); nothing to wait for
     A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: a killed flag's switches are not disabled (the table cannot disable a single row's switch); flipping one resolves with an error that says the flag is killed. The environment cells show only the switch (no On/Off text). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['flags' => [], 'environments' => [], 'toggle' => true, 'open' => true, 'create' => true, 'delete' => true, 'rolloutEnvironment' => null, 'title' => null, 'description' => null, 'pageSize' => 8, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $T = \Nasaq\Nasaq::class;
    $L = fn (string $k, string $en, string $ar) => $labels[$k] ?? $T::t($en, $ar);
    $ar = str_starts_with($locale, 'ar');
    $envs = array_values(array_map(fn ($e) => (array) $e, (array) $environments));
    $rollout = collect($envs)->firstWhere('id', $rolloutEnvironment) ?? ($envs ? $envs[count($envs) - 1] : null);
    $states = [
        'on' => $L('stateOn', 'On', 'يعمل'),
        'partial' => $L('statePartial', 'Rolling out', 'إطلاق تدريجي'),
        'off' => $L('stateOff', 'Off', 'متوقف'),
        'killed' => $L('stateKilled', 'Killed', 'موقوف طارئًا'),
    ];
    $tones = ['on' => 'success', 'partial' => 'warning', 'off' => 'neutral', 'killed' => 'danger'];
    $stateOf = function (array $f, string $env) {
        if (! empty($f['killed'])) return 'killed';
        $e = $f['environments'][$env] ?? null;
        if (! $e || empty($e['enabled']) || ($e['rollout'] ?? 0) <= 0) return 'off';
        return ($e['rollout'] ?? 0) < 100 ? 'partial' : 'on';
    };
    $by = fn ($n) => $ar ? 'بواسطة '.$n : 'by '.$n;
    $rows = collect($flags)->map(fn ($f) => (array) $f)->sortByDesc('updatedAt')->map(function ($f) use ($envs, $rollout, $stateOf, $toggle, $by) {
        $row = [
            'id' => (string) $f['key'], 'key' => $f['key'], 'name' => $f['name'], 'killed' => ! empty($f['killed']),
            'search' => trim($f['name'].' '.$f['key'].' '.implode(' ', (array) ($f['tags'] ?? []))),
            'updated' => $f['updatedAt'], 'updatedByText' => ! empty($f['updatedBy']) ? $by($f['updatedBy']) : '',
        ];
        foreach ($envs as $i => $e) {
            $on = ! empty($f['environments'][$e['id']]['enabled']);
            $row['env_'.$i] = $toggle ? $on : ($on ? 'on' : 'off');
        }
        if ($rollout) {
            $row['rollout'] = $f['environments'][$rollout['id']]['rollout'] ?? 0;
            $row['state'] = $stateOf($f, $rollout['id']);
        }
        return $row;
    })->values()->all();
    $columns = [['id' => 'flag', 'header' => $L('flag', 'Flag', 'المفتاح'), 'key' => 'search', 'sortable' => true, 'searchable' => true, 'hideable' => false]];
    foreach ($envs as $i => $e) {
        $columns[] = $toggle
            ? ['id' => 'env_'.$i, 'header' => $e['label'], 'type' => 'boolean', 'edit' => 'switch', 'align' => 'center', 'sortable' => true]
            : ['id' => 'env_'.$i, 'header' => $e['label'], 'type' => 'status', 'align' => 'center', 'sortable' => true, 'options' => [['value' => 'on', 'label' => $states['on'], 'tone' => 'success'], ['value' => 'off', 'label' => $states['off'], 'tone' => 'neutral']]];
    }
    if ($rollout) {
        $rolloutHeader = $ar ? 'الإطلاق في '.$rollout['label'] : 'Rollout in '.$rollout['label'];
        $columns[] = ['id' => 'rollout', 'header' => $labels['rollout'] ?? $rolloutHeader, 'type' => 'meter', 'warnAt' => 2, 'dangerAt' => 2, 'sortable' => true, 'align' => 'end'];
        $columns[] = ['id' => 'state', 'header' => $L('state', 'State', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true,
            'options' => array_map(fn ($s) => ['value' => $s, 'label' => $states[$s], 'tone' => $tones[$s]], ['on', 'partial', 'off', 'killed'])];
    }
    $columns[] = ['id' => 'updated', 'header' => $L('updated', 'Updated', 'آخر تحديث'), 'type' => 'datetime', 'format' => 'relative', 'sortable' => true];
    $actions = array_values(array_filter([
        $open ? ['id' => 'open', 'label' => $L('openLabel', 'Open', 'فتح'), 'icon' => 'external-link'] : null,
        ['id' => 'copy', 'label' => $L('copyKey', 'Copy key', 'نسخ المفتاح'), 'icon' => 'copy'],
        $delete ? ['id' => 'delete', 'label' => $L('remove', 'Delete', 'حذف'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'z'] : null,
    ]));
    $config = [
        'rows' => $rows, 'envs' => array_column($envs, 'id'),
        'labels' => ['failed' => $L('failed', 'Could not save this. Try again.', 'تعذّر الحفظ. حاول مرة أخرى.'), 'killed' => $L('killedMessage', 'This flag is killed. Restore it before changing its switches.', 'هذا المفتاح موقوف طارئًا. استعده قبل تغيير مفاتيحه.')],
    ];
@endphp
{{-- The card classes, copied from card.blade.php, so data-slot can be feature-flag-list. --}}
<div data-slot="{{ $attributes->get('data-slot', 'feature-flag-list') }}" x-data="nqFeatureFlagList(@js($config))"
    x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-row-click="onRow($event)" x-on:nq-data-table-edit="onEdit($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $L('title', 'Feature flags', 'مفاتيح الميزات') }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $L('description', 'Turn features on per environment, roll them out gradually and stop them fast.', 'شغّل الميزات لكل بيئة، وأطلقها تدريجيًا، وأوقفها بسرعة.') }}</x-nq::card.description>
        @if ($create)
            <x-nq::card.action>
                <x-nq::button size="sm" x-on:click="$el.dispatchEvent(new CustomEvent('create', { bubbles: true }))">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $L('create', 'New flag', 'مفتاح جديد') }}
                </x-nq::button>
            </x-nq::card.action>
        @endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="notice">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$L('tableLabel', 'Feature flags', 'مفاتيح الميزات')" :view-options="false" :columns="$columns" :rows="$rows" :row-actions="$actions"
            :row-click="$open" :page-size="$pageSize" :loading="$loading" :error="$error"
            :labels="['search' => $L('filter', 'Filter flags by name or key…', 'تصفية المفاتيح بالاسم أو المفتاح…'), 'empty' => $L('empty', 'No feature flags yet', 'لا مفاتيح ميزات بعد')]">
            <x-slot name="cell_flag">
                <span class="flex min-w-0 flex-col">
                    <span dir="auto" class="block max-w-[28ch] truncate text-label text-foreground" x-text="row.name"></span>
                    <bdi dir="ltr" class="block max-w-[28ch] truncate font-mono text-caption text-muted-foreground" x-text="row.key"></bdi>
                </span>
            </x-slot>
            <x-slot name="cell_updated">
                <span class="flex flex-col">
                    <time class="tabular-nums" x-bind:datetime="isoOf(row, col('updated'))" x-bind:title="absoluteOf(row, col('updated'))" x-text="shownText(row, col('updated'))"></time>
                    <span class="text-caption text-muted-foreground" x-show="row.updatedByText" style="display: none" x-text="row.updatedByText"></span>
                </span>
            </x-slot>
        </x-nq::data-table>
    </x-nq::card.content>
</div>

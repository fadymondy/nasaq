{{-- <x-nq::funnel-chart.list :funnels="$funnels" @open="..." @create="..." @edit="..." @duplicate="$event.detail.wait(…)" @delete="$event.detail.wait(…)" />
     The saved funnels as a card with a table: steps, entrants, conversion with its change, window and last update, newest first. A row opens the funnel; the row menu (also on right-click) edits, duplicates and deletes.
     funnels: [['id', 'name', 'steps' => 4, 'entered' => 12000, 'conversion' => 0.035 (0 to 1), 'window' => '7 days' (already formatted), 'updatedAt' => ISO date, 'previousConversion' => 0.031 (adds the change in points)]].
     create, open, edit, duplicate, delete (all true): which controls to show. title, description, page-size (8), loading, error (a message), labels: array overriding the built-in words.
     It is presentational: it fires events on the root.
       open, edit, create   detail.id (create has none); nothing to wait for
       duplicate, delete    detail.id and wait(promise); resolve, or resolve { error } shown above the table. After a successful delete the row goes; a duplicate is yours to add (render again).
     A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the conversion and its change are one text cell (it sorts by the conversion itself, numerically), and the update date shows without the year setting. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['funnels' => [], 'create' => true, 'open' => true, 'edit' => true, 'duplicate' => true, 'delete' => true, 'title' => null, 'description' => null, 'pageSize' => 8, 'loading' => false, 'error' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $T = \Nasaq\Nasaq::class;
    $L = fn (string $k, string $en, string $ar) => $labels[$k] ?? $T::t($en, $ar);
    $ar = str_starts_with($locale, 'ar');
    $pct = fn ($n) => number_format($n * 100, 1, '.', '').'%';
    $stepsText = fn (int $n) => $ar ? ($n === 1 ? 'خطوة واحدة' : $n.' خطوات') : ($n === 1 ? '1 step' : $n.' steps');
    $rows = collect($funnels)->sortByDesc('updatedAt')->map(function ($f) use ($pct, $stepsText) {
        $change = isset($f['previousConversion']) ? $f['conversion'] - $f['previousConversion'] : 0;
        $trend = abs($change) < 0.00005 ? '' : ' ('.($change > 0 ? '+' : '-').number_format(abs($change * 100), 1, '.', '').')';
        return [
            'id' => (string) $f['id'], 'name' => $f['name'], 'steps' => $stepsText((int) $f['steps']), 'entered' => $f['entered'],
            'conversion' => $pct($f['conversion']).$trend, 'conversionValue' => (float) $f['conversion'], 'window' => $f['window'], 'updated' => substr((string) $f['updatedAt'], 0, 10),
        ];
    })->values()->all();
    $columns = [
        ['id' => 'name', 'header' => $L('name', 'Funnel', 'القمع'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'steps', 'header' => $L('steps', 'Steps', 'الخطوات'), 'align' => 'end'],
        ['id' => 'entered', 'header' => $L('entered', 'Entered', 'دخلوا'), 'type' => 'number', 'sortable' => true, 'align' => 'end'],
        ['id' => 'conversion', 'header' => $L('conversion', 'Conversion', 'التحويل'), 'sortable' => true, 'sortKey' => 'conversionValue', 'align' => 'end'],
        ['id' => 'window', 'header' => $L('window', 'Window', 'النافذة'), 'sortable' => true],
        ['id' => 'updated', 'header' => $L('updated', 'Updated', 'آخر تحديث'), 'type' => 'date', 'sortable' => true],
    ];
    $actions = array_values(array_filter([
        $edit ? ['id' => 'edit', 'label' => $L('edit', 'Edit', 'تعديل'), 'icon' => 'pencil'] : null,
        $duplicate ? ['id' => 'duplicate', 'label' => $L('duplicateLabel', 'Duplicate', 'نسخ'), 'icon' => 'copy'] : null,
        $delete ? ['id' => 'delete', 'label' => $L('remove', 'Delete', 'حذف'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
    $config = ['rows' => $rows, 'labels' => ['failed' => $L('failed', 'Could not do that. Try again.', 'تعذّر تنفيذ ذلك. حاول مرة أخرى.')]];
@endphp
{{-- The card classes, copied from card.blade.php, so data-slot can be funnel-list. --}}
<div data-slot="{{ $attributes->get('data-slot', 'funnel-list') }}" x-data="nqFunnelList(@js($config))"
    x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-row-click="onRow($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h3">{{ $title ?? $L('title', 'Funnels', 'أقماع التحويل') }}</x-nq::card.title>
        <x-nq::card.description>{{ $description ?? $L('description', 'Saved funnels and how each one converts right now.', 'الأقماع المحفوظة وكم يحوّل كل منها الآن.') }}</x-nq::card.description>
        @if ($create)
            <x-nq::card.action>
                <x-nq::button size="sm" x-on:click="$el.dispatchEvent(new CustomEvent('create', { bubbles: true }))">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $L('create', 'New funnel', 'قمع جديد') }}
                </x-nq::button>
            </x-nq::card.action>
        @endif
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="notice">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$L('tableLabel', 'Funnels', 'أقماع التحويل')" :view-options="false" :columns="$columns" :rows="$rows" :row-actions="$actions"
            :row-click="$open" :page-size="$pageSize" :loading="$loading" :error="$error"
            :labels="['search' => $L('filter', 'Filter funnels…', 'تصفية الأقماع…'), 'empty' => $L('empty', 'No funnels yet', 'لا أقماع بعد')]" />
    </x-nq::card.content>
</div>

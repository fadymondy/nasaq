{{-- <x-nq::report-filter-bar x-model="filters" :fields="[['id' => 'status', 'kind' => 'multi', 'label' => 'Status', 'options' => [['value' => 'open', 'label' => 'Open']]]]" comparison />
     The filters of a report: a period (presets, week, custom days, optional comparison) and any number of choice filters, with a removable chip for
     everything applied and a reset. It only edits `state`; pair it with <x-nq::saved-report-views> and <x-nq::report-export-menu>.
     fields: [['id', 'kind' => select|multi|toggle, 'label', 'options' => [['value', 'label']], 'allLabel'?]]. Ids must not be "range" or "compare".
     state: the starting filters, { range: { kind: 'relative', preset: '30d' }, comparison: 'none', fields: { status: ['open'] } }; it is x-modelable (x-model / wire:model),
     and an empty list means "all". defaults: what reset returns to and what counts as applied (default: the last 30 days, no comparison, no filters).
     range: false hides the period picker, or an array of its options (presets, allow-week, allow-custom, allow-future, time-zone, week-starts-on, show-summary, now).
     comparison: show "Compare with" beside the period. presets: shortcut for range.presets. Fires "filters-change" ({ state, query }); `query` is the URL form.
     The `actions` slot sits beside the reset button: <x-slot:actions>…</x-slot:actions>. labels: override the strings by key. locale.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['fields' => [], 'state' => null, 'defaults' => null, 'range' => [], 'comparison' => false, 'presets' => null, 'labels' => [], 'locale' => null])
@php
    $N = \Nasaq\Nasaq::class;
    $L = array_merge([
        'filters' => $N::t('Report filters', 'مرشّحات التقرير'),
        'reset' => $N::t('Reset filters', 'إعادة ضبط المرشّحات'),
        'all' => $N::t('All', 'الكل'),
        'selected' => $N::t('{0} selected', '{0} محدّد'),
        'clear' => $N::t('Clear', 'مسح'),
        'activeOne' => $N::t('1 filter applied', 'مرشّح واحد مطبّق'),
        'activeTwo' => $N::t('{0} filters applied', 'مرشّحان مطبّقان'),
        'activeMany' => $N::t('{0} filters applied', '{0} مرشّحات مطبّقة'),
        'removeFilter' => $N::t('Remove filter {0}', 'إزالة المرشّح {0}'),
    ], (array) $labels);
    $fields = array_values(array_map(fn ($f) => [
        'id' => (string) $f['id'],
        'kind' => $f['kind'] ?? 'select',
        'label' => (string) $f['label'],
        'allLabel' => $f['allLabel'] ?? null,
        'options' => array_values(array_map(fn ($o) => ['value' => (string) $o['value'], 'label' => (string) $o['label']], (array) ($f['options'] ?? []))),
    ], (array) $fields));
    $init = ['fields' => $fields, 'state' => $state, 'defaults' => $defaults, 'comparison' => (bool) $comparison, 't' => $L];
    $pickerOpts = $range === false ? null : (array) $range;
    $pick = fn (string $key, $fallback = null) => $pickerOpts[$key] ?? $pickerOpts[\Illuminate\Support\Str::camel($key)] ?? $fallback;
    $startRange = $state['range'] ?? $defaults['range'] ?? ['kind' => 'relative', 'preset' => '30d'];
    // The chips of the starting state, drawn on the server so there is no flash; Alpine removes them and draws the same ones from its state.
    $ssrChips = [];
    foreach ($fields as $f) {
        $vals = [];
        foreach ((array) ($state['fields'][$f['id']] ?? []) as $v) {
            $v = (string) $v;
            if ($v === '' || in_array($v, $vals, true) || ! in_array($v, array_column($f['options'], 'value'), true)) continue;
            $vals[] = $v;
        }
        if ($f['kind'] !== 'multi') $vals = array_slice($vals, 0, 1);
        foreach ($vals as $v) {
            $ssrChips[] = ['key' => $f['id'].':'.$v, 'fieldLabel' => $f['label'], 'label' => collect($f['options'])->firstWhere('value', $v)['label'] ?? $v];
        }
    }
    $startCompare = $state['comparison'] ?? $defaults['comparison'] ?? 'none';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'report-filter-bar') }}" role="group" aria-label="{{ $L['filters'] }}" x-data="nqReportFilterBar({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="state"
    x-on:comparison-change="onCompare($event)" {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-3') }}>
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
        @if ($pickerOpts !== null)
            <x-nq::time-range-picker x-model="rangeValue" :value="$startRange" :comparison="$comparison ? $startCompare : null"
                :presets="$presets ?? $pick('presets', ['1h', '6h', '24h', '7d', '30d'])" :allow-week="$pick('allow-week', true)" :allow-custom="$pick('allow-custom', true)" :allow-future="$pick('allow-future', false)"
                :time-zone="$pick('time-zone')" :week-starts-on="$pick('week-starts-on')" :show-summary="$pick('show-summary', true)" :now="$pick('now')" :locale="$locale" />
        @endif
        @foreach ($fields as $f)
            <x-nq::report-filter-bar.field :field="$f" :labels="$L" />
        @endforeach
        <div class="ms-auto flex flex-wrap items-center gap-2">
            <span aria-live="polite" class="text-caption text-muted-foreground" x-text="activeText"></span>
            <x-nq::button variant="ghost" size="sm" x-bind:disabled="count === 0" x-on:click="reset()">
                <x-lucide-rotate-ccw aria-hidden="true" class="rtl:-scale-x-100" />
                {{ $L['reset'] }}
            </x-nq::button>
            {{ $actions ?? '' }}
        </div>
    </div>
    <ul data-slot="report-filter-chips" class="flex flex-wrap gap-1.5" aria-label="{{ $L['filters'] }}" x-show="chips.length !== 0" @if (count($ssrChips) === 0) x-cloak style="display: none" @endif>
        @foreach ($ssrChips as $chip)
            <li data-nq-ssr="">
                <x-nq::badge variant="outline" class="gap-1 pe-1">
                    <span class="text-muted-foreground"><span>{{ $chip['fieldLabel'] }}</span>:</span> <span>{{ $chip['label'] }}</span>
                    <button type="button" aria-label="{{ str_replace('{0}', $chip['fieldLabel'].': '.$chip['label'], $L['removeFilter']) }}"
                        class="inline-flex size-4 items-center justify-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3" />
                    </button>
                </x-nq::badge>
            </li>
        @endforeach
        <template x-for="chip in chips" :key="chip.key">
            <li>
                <x-nq::badge variant="outline" class="gap-1 pe-1">
                    <span class="text-muted-foreground"><span x-text="chip.fieldLabel"></span>:</span> <span x-text="chip.label"></span>
                    <button type="button" x-bind:aria-label="removeLabel(chip)" x-on:click="removeChip(chip)"
                        class="inline-flex size-4 items-center justify-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3" />
                    </button>
                </x-nq::badge>
            </li>
        </template>
    </ul>
</div>

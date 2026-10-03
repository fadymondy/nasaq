{{-- <x-nq::schema-repeater :fields="[['key' => 'name', 'type' => 'text', 'label' => 'Name', 'required' => true]]" :rows="[['name' => 'Sara']]" :min="1" :max="5" title-key="name" label="Contacts" />
     A repeater whose rows come from a field schema: text, number, select, switch, date and nested repeaters, with validation (required, lengths, ranges, patterns).
     fields: arrays like the React SchemaField ({ key, type, label, required, ... }). PHP closures cannot cross to the browser: use hiddenWhen => ['key' => 'kind', 'equals' => 'x'] in place of hidden.
     rows: the initial rows (x-modelable: x-model="rows" reads the rows). show-errors reveals every error at once. server-errors: [[ 'fieldKey' => 'message' ]] per top-level row.
     messages: overrides of the built-in messages as templates with :label, :n and :date. title-key, min, max, label, add-label, reorderable, duplicable, collapsible, default-collapsed, disabled.
     Fires "nq-schema-validate" ({ valid, count, message, rows }) when the number of issues changes. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['fields' => [], 'rows' => [], 'min' => null, 'max' => null, 'label' => null, 'titleKey' => null, 'showErrors' => false, 'serverErrors' => [], 'messages' => [], 'addLabel' => null, 'reorderable' => true, 'duplicable' => true, 'collapsible' => true, 'defaultCollapsed' => false, 'disabled' => false])
@php
    $config = \Illuminate\Support\Js::from(array_filter([
        'fields' => array_values($fields),
        'rows' => array_values((array) $rows),
        'min' => $min,
        'max' => $max,
        'label' => $label,
        'titleKey' => $titleKey,
        'showErrors' => $showErrors ?: null,
        'serverErrors' => $serverErrors ?: null,
        'messages' => $messages ?: null,
    ], fn ($v) => $v !== null))->toHtml();
    $listLabel = $label ?? \Nasaq\Nasaq::t('Rows', 'الصفوف');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'schema-repeater') }}" x-data="nqSchemaRepeater({!! $config !!})" x-modelable="rows" x-on:change="onRowsChange($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-2') }}>
    <x-nq::repeater :items="[]" x-model="rows" create-item="newRow()" row-title="rowTitle(item)" row-summary="rowSummary(item)"
        :min="(int) $min" :max="$max" :label="$listLabel" :add-label="$addLabel" :reorderable="$reorderable" :duplicable="$duplicable" :collapsible="$collapsible"
        :default-collapsed="$defaultCollapsed" :disabled="$disabled">
        <x-nq::schema-repeater.fields :fields="$fields" />
    </x-nq::repeater>
    <p role="alert" data-slot="schema-repeater-error" x-show="countMessage()" x-text="countMessage()" style="display: none" class="text-caption text-nq-danger-text"></p>
</div>

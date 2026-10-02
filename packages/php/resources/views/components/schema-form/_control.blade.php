{{-- Internal: the control of one schema-form field (no label, no message), bound to m[path]. Used by single fields and by the items of a list.
     Variables: $field, $P (the path as a JS template literal), $label (accessible name), $rels (relation sources), $t (words), $disabled, $ariaJs (JS for a dynamic aria-label, optional). --}}
@php
    $type = $field['type'];
    $rel = $field['relation'] ?? null;
    $src = $rel ? ((array) ($rels[$rel['resource']] ?? [])) : [];
    $ariaJs = $ariaJs ?? null;
@endphp
@if ($rel)
    <x-nq::relation-picker x-model="m[{{ $P }}]" :multiple="(bool) $rel['multiple']" :options="$src['options'] ?? []" :search-url="$src['searchUrl'] ?? null"
        :resolve-url="$src['resolveUrl'] ?? null" :create-url="$src['createUrl'] ?? null" :label="$label" :disabled="(bool) $disabled" x-bind:aria-invalid="ariaInvalid({{ $P }})" />
@elseif ($type === 'text' && ! empty($field['multiline']))
    <x-nq::field.textarea x-model="m[{{ $P }}]" :placeholder="$field['placeholder'] ?? null" :dir="! empty($field['ltr']) ? 'ltr' : null" :aria-label="$ariaJs ? $label : null"
        x-bind:aria-invalid="ariaInvalid({{ $P }})" x-bind:data-invalid="invalidAttr({{ $P }})" />
@elseif ($type === 'text')
    @php $inputType = $field['inputType'] ?? 'text'; @endphp
    <x-nq::field.input :type="$inputType" :ltr="! empty($field['ltr'])" x-model="m[{{ $P }}]" :placeholder="$field['placeholder'] ?? null" :aria-label="$ariaJs ? $label : null"
        x-bind:aria-invalid="ariaInvalid({{ $P }})" x-bind:data-invalid="invalidAttr({{ $P }})" />
@elseif ($type === 'number')
    <div class="relative">
        <x-nq::field.input type="number" ltr :inputmode="! empty($field['integer']) ? 'numeric' : 'decimal'" :min="$field['min'] ?? null" :max="$field['max'] ?? null"
            :step="$field['step'] ?? (! empty($field['integer']) ? 1 : 'any')" :placeholder="$field['placeholder'] ?? null" :class="! empty($field['unit']) ? 'pe-12' : null" :aria-label="$ariaJs ? $label : null"
            x-bind:value="num({{ $P }})" x-on:input="m[{{ $P }}] = $event.target.value"
            x-bind:aria-invalid="ariaInvalid({{ $P }})" x-bind:data-invalid="invalidAttr({{ $P }})" />
        @if (! empty($field['unit']))<span class="pointer-events-none absolute inset-y-0 end-3 flex items-center text-body-sm text-muted-foreground">{{ $field['unit'] }}</span>@endif
    </div>
@elseif ($type === 'select')
    <x-nq::select x-model="m[{{ $P }}]">
        <x-nq::select.trigger :aria-label="$ariaJs ? $label : null" x-bind:data-invalid="invalidAttr({{ $P }})" x-bind:aria-invalid="ariaInvalid({{ $P }})">
            <x-nq::select.value :placeholder="$field['placeholder'] ?? $t['select']" />
        </x-nq::select.trigger>
        <x-nq::select.content>
            @foreach ($field['options'] as $option)
                <x-nq::select.item :value="$option['value']">{{ $option['label'] }}</x-nq::select.item>
            @endforeach
        </x-nq::select.content>
    </x-nq::select>
@elseif ($type === 'switch')
    <x-nq::switch x-model="m[{{ $P }}]" :aria-label="$label" />
@elseif ($type === 'date')
    <x-nq::date-picker x-model="m[{{ $P }}]" :min="$field['min'] ?? null" :max="$field['max'] ?? null" :aria-label="$label" />
@endif

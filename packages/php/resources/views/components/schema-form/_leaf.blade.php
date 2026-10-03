{{-- Internal: one field of the schema form: label, control, description and error. Variables: $node, $P, $t, $rels, $disabled. --}}
@php
    $field = $node['field'];
    $isSwitch = $field['type'] === 'switch' && empty($field['relation']);
    $isReq = ! empty($node['required']);
    $star = '<span x-show="required('.$P.')" aria-hidden="true" class="ms-0.5 text-nq-danger-text"'.($isReq ? '' : ' style="display: none"').'>*</span>';
@endphp
@if ($isSwitch)
    <x-nq::field class="flex-row items-start justify-between gap-4 rounded-control border border-border px-3 py-2.5">
        <div class="flex min-w-0 flex-col gap-0.5">
            <x-nq::field.label>{{ $field['label'] }}{!! $star !!}</x-nq::field.label>
            @if (! empty($field['description']))<x-nq::field.description>{{ $field['description'] }}</x-nq::field.description>@endif
            <div data-slot="field-error" role="alert" x-show="msg({{ $P }})" x-text="msg({{ $P }})" style="display: none" class="text-caption text-nq-danger-text"></div>
        </div>
        @include('nasaq::components.schema-form._control', ['field' => $field, 'P' => $P, 'label' => $field['label']])
    </x-nq::field>
@else
    <x-nq::field>
        <x-nq::field.label>{{ $field['label'] }}{!! $star !!}</x-nq::field.label>
        @include('nasaq::components.schema-form._control', ['field' => $field, 'P' => $P, 'label' => $field['label']])
        @if (! empty($field['description']))<x-nq::field.description>{{ $field['description'] }}</x-nq::field.description>@endif
        <div data-slot="field-error" role="alert" x-show="msg({{ $P }})" x-text="msg({{ $P }})" style="display: none" class="text-caption text-nq-danger-text"></div>
    </x-nq::field>
@endif

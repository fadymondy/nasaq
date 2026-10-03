{{-- Internal: the controls of one schema row. Used by <x-nq::schema-repeater> (and by itself for nested repeaters). --}}
@props(['fields', 'top' => true, 'path' => ''])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $levelJs = "`".$path."`";
    $indexJs = $top ? 'index' : 'null';
    $star = '<span aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span>';
@endphp
<div x-show="issueCount(item, {{ $levelJs }}, {{ $indexJs }}) > 0" style="display: none" class="mb-3">
    <x-nq::badge variant="danger" data-slot="schema-repeater-issues" x-text="issuesText(issueCount(item, {{ $levelJs }}, {{ $indexJs }}))"></x-nq::badge>
</div>
<div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
    @foreach ($fields as $field)
        @php
            $key = (string) $field['key'];
            $keyJs = "`".$key."`";
            $F = "`".($path === "" ? "" : $path.".").$loop->index."`";
            $type = $field['type'];
            $span = $type === 'switch' || $type === 'repeater' || ($type === 'text' && ! empty($field['multiline'])) || ($field['width'] ?? 'full') !== 'half' ? 'sm:col-span-2' : '';
            $msg = 'msg(item, '.$F.', '.$indexJs.')';
            $hide = ! empty($field['hiddenWhen']) ? 'x-show="! hidden(item, '.$F.')"' : '';
            $required = ! empty($field['required']);
            $nestedJs = $F;
            $nestedTitle = ! empty($field["titleKey"]) ? "item[`".$field["titleKey"]."`] || ``" : null;
            $nestedSummary = "rowSummary(item, ".$nestedJs.")";
        @endphp
        <div {!! $hide !!} class="min-w-0 {{ $span }}">
            @if ($type === 'repeater')
                <fieldset data-slot="schema-repeater-nested" class="flex min-w-0 flex-col gap-2 border-0 p-0">
                    <legend class="mb-1 text-label text-foreground">{{ $field['label'] }}@if ($required){!! $star !!}@endif</legend>
                    @if (! empty($field['description']))<p class="-mt-1 text-caption text-muted-foreground">{{ $field['description'] }}</p>@endif
                    <x-nq::repeater :items="[]" x-model="item[{{ $keyJs }}]" create-item="newRow({{ $nestedJs }})"
                        :row-title="$nestedTitle"
                        :row-summary="$nestedSummary"
                        :min="max((int) ($field['min'] ?? 0), $required ? 1 : 0)" :max="$field['max'] ?? null" :label="$field['label']" :add-label="$field['addLabel'] ?? null">
                        <x-nq::schema-repeater.fields :fields="$field['fields']" :top="false" :path="trim($F, '`')" />
                    </x-nq::repeater>
                    <div role="alert" x-show="{{ $msg }}" x-text="{{ $msg }}" style="display: none" class="text-caption text-nq-danger-text"></div>
                </fieldset>
            @elseif ($type === 'switch')
                <x-nq::field class="flex-row items-start justify-between gap-4 rounded-control border border-border px-3 py-2.5">
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <x-nq::field.label>{{ $field['label'] }}@if ($required){!! $star !!}@endif</x-nq::field.label>
                        @if (! empty($field['description']))<x-nq::field.description>{{ $field['description'] }}</x-nq::field.description>@endif
                        <div data-slot="field-error" role="alert" x-show="{{ $msg }}" x-text="{{ $msg }}" style="display: none" class="text-caption text-nq-danger-text"></div>
                    </div>
                    <span class="contents" x-on:click="touch(item, {{ $keyJs }})">
                        <x-nq::switch x-model="item[{{ $keyJs }}]" :aria-label="$field['label']" />
                    </span>
                </x-nq::field>
            @else
                <x-nq::field>
                    <x-nq::field.label>{{ $field['label'] }}@if ($required){!! $star !!}@endif</x-nq::field.label>
                    @if ($type === 'text' && ! empty($field['multiline']))
                        <x-nq::field.textarea x-model="item[{{ $keyJs }}]" x-on:input="touch(item, {{ $keyJs }})" x-on:blur="touch(item, {{ $keyJs }})"
                            :placeholder="$field['placeholder'] ?? null" :dir="! empty($field['ltr']) ? 'ltr' : null"
                            x-bind:aria-invalid="{{ $msg }} ? 'true' : null" x-bind:data-invalid="{{ $msg }} ? '' : null" />
                    @elseif ($type === 'text')
                        @php $inputType = $field['inputType'] ?? 'text'; $ltr = ! empty($field['ltr']) || in_array($inputType, ['email', 'url', 'tel'], true); @endphp
                        <x-nq::field.input :type="$inputType" :ltr="$ltr" x-model="item[{{ $keyJs }}]" x-on:input="touch(item, {{ $keyJs }})" x-on:blur="touch(item, {{ $keyJs }})"
                            :placeholder="$field['placeholder'] ?? null"
                            x-bind:aria-invalid="{{ $msg }} ? 'true' : null" x-bind:data-invalid="{{ $msg }} ? '' : null" />
                    @elseif ($type === 'number')
                        <div class="relative">
                            <x-nq::field.input type="number" ltr :inputmode="! empty($field['integer']) ? 'numeric' : 'decimal'"
                                :min="$field['min'] ?? null" :max="$field['max'] ?? null" :step="$field['step'] ?? (! empty($field['integer']) ? 1 : 'any')"
                                :placeholder="$field['placeholder'] ?? null" :class="! empty($field['unit']) ? 'pe-12' : null"
                                x-bind:value="item[{{ $keyJs }}] ?? ''" x-on:input="setNumber(item, {{ $keyJs }}, $event.target.value)" x-on:blur="touch(item, {{ $keyJs }})"
                                x-bind:aria-invalid="{{ $msg }} ? 'true' : null" x-bind:data-invalid="{{ $msg }} ? '' : null" />
                            @if (! empty($field['unit']))<span class="pointer-events-none absolute inset-y-0 end-3 flex items-center text-body-sm text-muted-foreground">{{ $field['unit'] }}</span>@endif
                        </div>
                    @elseif ($type === 'select')
                        <x-nq::select x-model="item[{{ $keyJs }}]" x-init="$watch('value', () => touch(item, {{ $keyJs }}))">
                            <x-nq::select.trigger x-bind:data-invalid="{{ $msg }} ? '' : null" x-bind:aria-invalid="{{ $msg }} ? 'true' : null">
                                <x-nq::select.value :placeholder="$field['placeholder'] ?? $t('Select…', 'اختر…')" />
                            </x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($field['options'] as $option)
                                    <x-nq::select.item :value="$option['value']">{{ $option['label'] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    @elseif ($type === 'date')
                        <x-nq::date-picker x-model="item[{{ $keyJs }}]" :min="$field['min'] ?? null" :max="$field['max'] ?? null" :aria-label="$field['label']" x-init="$watch('value', () => touch(item, {{ $keyJs }}))" />
                    @endif
                    @if (! empty($field['description']))<x-nq::field.description>{{ $field['description'] }}</x-nq::field.description>@endif
                    <div data-slot="field-error" role="alert" x-show="{{ $msg }}" x-text="{{ $msg }}" style="display: none" class="text-caption text-nq-danger-text"></div>
                </x-nq::field>
            @endif
        </div>
    @endforeach
</div>

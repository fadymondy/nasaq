{{-- Internal: one condition group of <x-nq::rule-builder>, unrolled to max-depth levels (an Alpine template cannot recurse).
     g: the JS expression of this group (rule.conditions at depth 1, the loop variable of the parent otherwise). --}}
@props(['g', 'depth' => 1, 'maxDepth' => 3, 'l', 'control'])
@php
    $n = 'n'.$depth;
    $toggle = 'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:pointer-events-none data-disabled:opacity-50 rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs';
@endphp
<div x-bind:data-group="{{ $g }}.id" role="group" x-bind:aria-label="groupLabel({{ $g }})"
    class="flex flex-col gap-3 rounded-control border border-border p-3 {{ $depth > 1 ? 'bg-nq-surface-soft' : '' }}">
    <div class="flex flex-wrap items-center gap-2">
        <span class="text-label text-muted-foreground">{{ $l['match'] }}</span>
        <div role="group" data-slot="toggle-group" data-variant="segmented" data-orientation="horizontal" aria-label="{{ $l['match'] }}" x-bind:data-disabled="disabled ? '' : null"
            class="flex w-fit max-w-full gap-0.5 rounded-control bg-secondary p-0.5">
            <button type="button" data-slot="toggle" class="{{ $toggle }}" x-bind:aria-pressed="{{ $g }}.join === 'and' ? 'true' : 'false'" x-bind:data-pressed="{{ $g }}.join === 'and' ? '' : null"
                x-bind:disabled="disabled" x-bind:data-disabled="disabled ? '' : null" x-on:click="setJoin({{ $g }}, 'and')">{{ $l['matchAll'] }}</button>
            <button type="button" data-slot="toggle" class="{{ $toggle }}" x-bind:aria-pressed="{{ $g }}.join === 'or' ? 'true' : 'false'" x-bind:data-pressed="{{ $g }}.join === 'or' ? '' : null"
                x-bind:disabled="disabled" x-bind:data-disabled="disabled ? '' : null" x-on:click="setJoin({{ $g }}, 'or')">{{ $l['matchAny'] }}</button>
        </div>
        @if ($depth > 1)
            <x-nq::button type="button" variant="ghost" size="sm" class="ms-auto" x-on:click="removeNode({{ $g }}.id)" x-bind:disabled="disabled" x-bind:data-disabled="disabled ? '' : null">
                <x-lucide-trash-2 aria-hidden="true" />
                {{ $l['removeGroup'] }}
            </x-nq::button>
        @endif
    </div>
    <p class="text-body-sm text-muted-foreground" x-show="{{ $g }}.children.length === 0" style="display: none">{{ $l['noConditions'] }}</p>
    <ul class="flex flex-col gap-3">
        <template x-for="{{ $n }} in {{ $g }}.children" x-bind:key="{{ $n }}.id">
            <li x-bind:data-condition="{{ $n }}.kind === 'condition' ? {{ $n }}.id : null"
                x-bind:class="{{ $n }}.kind === 'condition' ? 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_minmax(0,1fr)_auto]' : ''">
                <template x-if="{{ $n }}.kind === 'group'">
                    <div>
                        @if ($depth < $maxDepth)
                            <x-nq::rule-builder.group :g="$n" :depth="$depth + 1" :max-depth="$maxDepth" :l="$l" :control="$control" />
                        @endif
                    </div>
                </template>
                <template x-if="{{ $n }}.kind === 'condition'">
                    <div class="contents">
                        <select data-slot="select" aria-label="{{ $l['field'] }}" x-bind:disabled="disabled" x-bind:data-invalid="bad({{ $n }}, 'no-field') ? '' : null"
                            x-bind:aria-invalid="bad({{ $n }}, 'no-field') ? 'true' : null" class="{{ $control }} h-control" x-on:change="setField({{ $n }}, $event.target.value)">
                            <option value="" x-bind:selected="! {{ $n }}.field">{{ $l['chooseField'] }}</option>
                            <template x-for="f in fields" x-bind:key="f.id"><option x-bind:value="f.id" x-bind:selected="f.id === {{ $n }}.field" x-text="f.label"></option></template>
                        </select>
                        <x-nq::button type="button" variant="ghost" size="icon-sm" class="sm:order-last" aria-label="{{ $l['removeCondition'] }}" title="{{ $l['removeCondition'] }}"
                            x-on:click="removeNode({{ $n }}.id)" x-bind:disabled="disabled" x-bind:data-disabled="disabled ? '' : null">
                            <x-lucide-trash-2 aria-hidden="true" />
                        </x-nq::button>
                        <select data-slot="select" aria-label="{{ $l['operator'] }}" x-bind:disabled="disabled || ! {{ $n }}.field" class="{{ $control }} h-control col-span-2 sm:col-span-1"
                            x-on:change="{{ $n }}.op = $event.target.value">
                            <template x-for="o in ops({{ $n }})" x-bind:key="o.value"><option x-bind:value="o.value" x-bind:selected="o.value === {{ $n }}.op" x-text="o.label"></option></template>
                        </select>
                        <div class="col-span-2 min-w-0 sm:col-span-1">
                            <template x-if="! unary({{ $n }}) && isChoice({{ $n }})">
                                <select data-slot="select" aria-label="{{ $l['value'] }}" x-bind:disabled="disabled" x-bind:data-invalid="bad({{ $n }}, 'no-value') ? '' : null"
                                    x-bind:aria-invalid="bad({{ $n }}, 'no-value') ? 'true' : null" class="{{ $control }} h-control" x-on:change="{{ $n }}.value = $event.target.value">
                                    <option value="" x-bind:selected="! {{ $n }}.value"></option>
                                    <template x-for="o in choices({{ $n }})" x-bind:key="o.value"><option x-bind:value="o.value" x-bind:selected="o.value === {{ $n }}.value" x-text="o.label"></option></template>
                                </select>
                            </template>
                            <template x-if="! unary({{ $n }}) && ! isChoice({{ $n }})">
                                <input data-slot="input" aria-label="{{ $l['value'] }}" x-bind:type="isNumber({{ $n }}) ? 'number' : 'text'" x-bind:inputmode="isNumber({{ $n }}) ? 'decimal' : null"
                                    x-bind:dir="isNumber({{ $n }}) ? 'ltr' : null" x-bind:disabled="disabled" x-bind:aria-invalid="bad({{ $n }}, 'no-value') ? 'true' : null"
                                    x-bind:data-invalid="bad({{ $n }}, 'no-value') ? '' : null" x-bind:value="{{ $n }}.value" x-on:input="{{ $n }}.value = $event.target.value" class="{{ $control }} h-control">
                            </template>
                        </div>
                    </div>
                </template>
            </li>
        </template>
    </ul>
    <div class="flex flex-wrap gap-2">
        <x-nq::button type="button" variant="secondary" size="sm" x-bind:disabled="disabled" x-bind:data-disabled="disabled ? '' : null" x-on:click="addCondition({{ $g }})">
            <x-lucide-plus aria-hidden="true" />
            {{ $l['addCondition'] }}
        </x-nq::button>
        @if ($depth < $maxDepth)
            <x-nq::button type="button" variant="ghost" size="sm" x-bind:disabled="disabled" x-bind:data-disabled="disabled ? '' : null" x-on:click="addGroup({{ $g }})">
                <x-lucide-plus aria-hidden="true" />
                {{ $l['addGroup'] }}
            </x-nq::button>
        @endif
    </div>
</div>

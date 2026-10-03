{{-- Internal to <x-nq::report-filter-bar>: one filter, a label above a select, a multi-select popover or a toggle group. The "no filter" choice
     uses a placeholder value because select and toggle items reject an empty string. --}}
@props(['field', 'labels'])
@php
    $ALL = '__nq-all__';
    $id = 'nq-report-filter-'.\Illuminate\Support\Str::random(6);
    $all = $field['allLabel'] ?? $labels['all'];
    $key = $field['id'];
@endphp
<div data-slot="report-filter-field" class="flex min-w-0 flex-col gap-1">
    <span id="{{ $id }}" class="text-caption text-muted-foreground">{{ $field['label'] }}</span>
    @if ($field['kind'] === 'select')
        <x-nq::select :value="$ALL" x-model="sel[`{{ $key }}`]">
            <x-nq::select.trigger aria-labelledby="{{ $id }}" class="h-control-sm w-auto min-w-36 max-w-full">
                <x-nq::select.value />
            </x-nq::select.trigger>
            <x-nq::select.content>
                <x-nq::select.item :value="$ALL">{{ $all }}</x-nq::select.item>
                @foreach ($field['options'] as $o)
                    <x-nq::select.item :value="$o['value']">{{ $o['label'] }}</x-nq::select.item>
                @endforeach
            </x-nq::select.content>
        </x-nq::select>
    @elseif ($field['kind'] === 'toggle')
        <x-nq::toggle-group aria-labelledby="{{ $id }}" :default-value="[$ALL]" x-model="tog[`{{ $key }}`]">
            <x-nq::toggle-group.toggle :value="$ALL" aria-label="{{ $all }}">{{ $all }}</x-nq::toggle-group.toggle>
            @foreach ($field['options'] as $o)
                <x-nq::toggle-group.toggle :value="$o['value']">{{ $o['label'] }}</x-nq::toggle-group.toggle>
            @endforeach
        </x-nq::toggle-group>
    @else
        <x-nq::popover>
            <x-nq::popover.trigger variant="secondary" size="sm" aria-labelledby="{{ $id }}" class="min-w-36 justify-between"><span x-text="summary(`{{ $key }}`)">{{ $all }}</span></x-nq::popover.trigger>
            <x-nq::popover.content align="start" class="w-64 p-1">
                <ul class="flex max-h-64 flex-col overflow-y-auto">
                    @foreach ($field['options'] as $o)
                        <li>
                            <label class="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-sm hover:bg-nq-hover">
                                <x-nq::checkbox x-model="chk[`{{ $key }}:{{ $o['value'] }}`]" />
                                <span class="min-w-0 flex-1 truncate">{{ $o['label'] }}</span>
                            </label>
                        </li>
                    @endforeach
                </ul>
                <div class="border-t border-border p-1">
                    <x-nq::button variant="ghost" size="sm" x-bind:disabled="!hasValues(`{{ $key }}`)" x-on:click="clearField(`{{ $key }}`)">{{ $labels['clear'] }}</x-nq::button>
                </div>
            </x-nq::popover.content>
        </x-nq::popover>
    @endif
</div>

{{-- Internal: the input-looking button the date pickers share. <x-nq::date-picker.trigger label-expression="label" icon="calendar-days" placeholder="Select a date" />
     Reads `label` / `placeholder` from the enclosing nqDatePicker or nqDateRangePicker; opens the popover around it. --}}
@aware(['invalid' => false, 'disabled' => false])
@props(['icon' => 'calendar-days', 'initial' => ''])
@php
    $class = [
        'flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground',
        'min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus',
        'data-invalid:border-nq-danger aria-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50',
        'pointer-coarse:text-[16px]',
    ];
@endphp
<button type="button" x-ref="trigger" data-slot="{{ $attributes->get('data-slot', 'date-picker-trigger') }}" aria-haspopup="dialog" x-on:click="toggle()"
    :aria-expanded="open" x-bind:data-popup-open="open ? '' : undefined"
    @if ($invalid) data-invalid aria-invalid="true" @endif
    @if ($disabled) disabled data-disabled @endif
    {{ $attributes->except('data-slot')->cn($class) }}>
    <span class="min-w-0 flex-1 truncate text-start tabular-nums" x-bind:class="label ? '' : 'text-muted-foreground'" x-bind:data-placeholder="label ? null : ''"
        x-text="label ?? placeholder">{{ $initial }}</span>
    <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
</button>

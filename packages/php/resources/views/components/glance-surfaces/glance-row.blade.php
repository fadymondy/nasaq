{{-- <x-nq::glance-surfaces.glance-row icon="clock" label="Timer running" value="00:42" tone="info" />
     One line of a glance: icon (a lucide name), label, optional detail, value. tone: neutral | success | warning | danger | info.
     selectable makes it a button that dispatches a bubbling "nq-select" event. dense is for a watch. --}}
@props(['icon' => null, 'label', 'value' => null, 'detail' => null, 'tone' => 'neutral', 'selectable' => false, 'dense' => false])
@php
    $toneText = ['neutral' => 'text-foreground', 'success' => 'text-nq-success-text', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text', 'info' => 'text-nq-info-text'];
    $tone = isset($toneText[$tone]) ? $tone : 'neutral';
    $base = 'flex w-full items-center gap-2.5 rounded-control '.($dense ? 'px-2 py-1' : 'px-3 py-2');
    $iconClass = \Nasaq\Cn::merge('shrink-0', $dense ? 'size-4' : 'size-[18px]', $tone === 'neutral' ? 'text-muted-foreground' : $toneText[$tone]);
@endphp
@if ($selectable)
<div data-slot="glance-row" {{ $attributes }}>
    <button type="button" x-on:click="$dispatch('nq-select')" class="{{ \Nasaq\Cn::merge($base, 'outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus') }}">
        @if ($icon)<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="{{ $iconClass }}" />@endif
        <span class="min-w-0 flex-1 text-start">
            <span class="{{ \Nasaq\Cn::merge('block truncate text-foreground', $dense ? 'text-caption' : 'text-label') }}">{{ $label }}</span>
            @if ($detail)<span class="block truncate text-caption text-muted-foreground">{{ $detail }}</span>@endif
        </span>
        @if ($value !== null)<span class="{{ \Nasaq\Cn::merge('shrink-0 tabular-nums', $dense ? 'text-caption font-medium' : 'text-label font-medium', $toneText[$tone]) }}">{{ $value }}</span>@endif
    </button>
</div>
@else
<div data-slot="{{ $attributes->get('data-slot', 'glance-row') }}" {{ $attributes->except('data-slot')->cn($base) }}>
    @if ($icon)<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="{{ $iconClass }}" />@endif
    <span class="min-w-0 flex-1 text-start">
        <span class="{{ \Nasaq\Cn::merge('block truncate text-foreground', $dense ? 'text-caption' : 'text-label') }}">{{ $label }}</span>
        @if ($detail)<span class="block truncate text-caption text-muted-foreground">{{ $detail }}</span>@endif
    </span>
    @if ($value !== null)<span class="{{ \Nasaq\Cn::merge('shrink-0 tabular-nums', $dense ? 'text-caption font-medium' : 'text-label font-medium', $toneText[$tone]) }}">{{ $value }}</span>@endif
</div>
@endif

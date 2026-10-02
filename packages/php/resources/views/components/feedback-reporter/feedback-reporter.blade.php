{{-- <x-nq::feedback-reporter shape="pill" position="bottom-end" x-on:click="…open your report dialog…" />
     The floating feedback button: a pill, a circle or a tab on the screen edge, in a corner or the middle of a side. Sides are logical: end is the right in English and the left in Arabic.
     It only draws the button; open your report dialog from its click. Parts: feedback-reporter.hub, feedback-reporter.configurator, feedback-reporter.shake-sheet.
     shape: pill (default) | circle | tab. position: bottom-end (default) | bottom-start | top-end | top-start | edge-end | edge-start (a tab always sits on an edge; a pill or circle never does).
     label: the words on the pill and tab, and the accessible name of the circle (default Feedback / ملاحظات). count: a number on the corner. placement: fixed (default) | absolute (inside a relative parent).
     Slot icon: replaces the default icon. --}}
@props(['shape' => 'pill', 'position' => 'bottom-end', 'label' => null, 'count' => null, 'placement' => 'fixed'])
@php
    $side = str_ends_with($position, 'start') ? 'start' : 'end';
    $where = $shape === 'tab' ? 'edge-'.$side : (str_starts_with($position, 'edge') ? 'bottom-'.$side : $position);
    $positions = [
        'bottom-end' => 'bottom-4 end-4',
        'bottom-start' => 'bottom-4 start-4',
        'top-end' => 'top-4 end-4',
        'top-start' => 'top-4 start-4',
        'edge-end' => 'end-0 top-1/2 -translate-y-1/2',
        'edge-start' => 'start-0 top-1/2 -translate-y-1/2',
    ];
    $text = $label ?? \Nasaq\Nasaq::t('Feedback', 'ملاحظات');
    $shapeClass = match ($shape) {
        'circle' => 'relative size-12 rounded-full',
        'tab' => ($where === 'edge-end' ? 'rounded-s-card' : 'rounded-e-card').' flex-col px-2 py-3',
        default => 'h-control rounded-full px-4',
    };
@endphp
<button type="button" data-slot="{{ $attributes->get('data-slot', 'feedback-launcher') }}" data-shape="{{ $shape }}" data-position="{{ $where }}"
    @if ($shape === 'circle') aria-label="{{ $text }}" @endif
    {{ $attributes->except('data-slot')->cn([
        'z-40 inline-flex items-center justify-center gap-2 bg-primary text-label text-primary-foreground shadow-floating outline-none',
        'transition-[filter,translate] duration-150 ease-nq hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        $placement,
        $positions[$where],
        $shapeClass,
    ]) }}>
    @isset($icon){{ $icon }}@else<x-lucide-message-square-plus aria-hidden="true" class="size-4" />@endisset
    @if ($shape !== 'circle')<span @class(['[writing-mode:vertical-rl] rtl:rotate-180' => $shape === 'tab'])>{{ $text }}</span>@endif
    @if ($count)<span @if ($shape !== 'circle') aria-hidden="true" @endif @class(['inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-caption text-foreground tabular-nums', 'absolute -end-1 -top-1 h-5 border border-border' => $shape === 'circle'])>{{ $count }}</span>@endif
</button>

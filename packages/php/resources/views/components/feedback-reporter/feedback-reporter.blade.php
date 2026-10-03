{{-- <x-nq::feedback-reporter shape="pill" position="bottom-end" x-on:click="…open your report dialog…" />
     The floating feedback button: a pill, a circle or a tab on the screen edge, in a corner or the middle of a side. Sides are logical: end is the right in English and the left in Arabic.
     It only draws the button; open your report dialog from its click. Parts: feedback-reporter.hub, feedback-reporter.configurator, feedback-reporter.shake-sheet.
     shape: pill (default) | circle | tab. position: bottom-end (default) | bottom-start | top-end | top-start | edge-end | edge-start (a tab always sits on an edge; a pill or circle never does).
     label: the words on the pill and tab, and the accessible name of the circle (default Feedback / ملاحظات). count: a number on the corner. placement: fixed (default) | absolute (inside a relative parent).
     Slot icon: replaces the default icon.
     movable: the visitor can drag it out of the way; on release it snaps to the nearer side and keeps its height, and Alt + arrow keys move it too (needs @nasaqScripts).
     The spot is remembered in localStorage under storage-key (default nasaq-feedback-launcher; pass an empty string to keep it in memory). spot: ['side' => 'start'|'end', 'y' => 0..1] starts it there.
     Fires nq-feedback-spot (detail { side, y }) on every move. A drag never counts as a click. labels: array override for moveHint. --}}
@props(['shape' => 'pill', 'position' => 'bottom-end', 'label' => null, 'count' => null, 'placement' => 'fixed', 'movable' => false, 'storageKey' => 'nasaq-feedback-launcher', 'spot' => null, 'labels' => []])
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
    $hint = $movable ? ($labels["moveHint"] ?? \Nasaq\Nasaq::t('Drag to move it out of the way. Alt + arrow keys move it too.', 'اسحبه لإبعاده عن طريقك. Alt مع الأسهم يحركه أيضًا.')) : null;
    $spotSide = $movable && is_array($spot) ? ($spot['side'] === 'start' ? 'start' : 'end') : null;
    $tabEnd = $spotSide ? $spotSide === 'end' : $where === 'edge-end';
    $placedStyle = $spotSide ? 'top: '.round(($spot['y'] ?? 0.5) * 100, 1).'%; inset-inline-'.$spotSide.': '.($shape === 'tab' ? '0px' : '1rem') : null;
    $config = $movable ? ['storageKey' => $storageKey !== '' ? $storageKey : null, 'spot' => $spotSide ? ['side' => $spotSide, 'y' => (float) ($spot['y'] ?? 0.5)] : null, 'position' => $where, 'placement' => $placement, 'shape' => $shape, 'positionClass' => $positions[$where]] : null;
    $shapeClass = match ($shape) {
        'circle' => 'relative size-12 rounded-full',
        'tab' => ($tabEnd ? 'rounded-s-card' : 'rounded-e-card').' flex-col px-2 py-3',
        default => 'h-control rounded-full px-4',
    };
@endphp
<button type="button" data-slot="{{ $attributes->get('data-slot', 'feedback-launcher') }}" data-shape="{{ $shape }}" @unless ($spotSide) data-position="{{ $where }}" @endunless
    @if ($movable) x-data="nqFeedbackLauncher(@js($config))" data-movable aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight" title="{{ $hint }}"
        x-bind:data-position="spot ? null : where" x-bind:data-side="spot ? spot.side : null" x-bind:data-dragging="dragAt ? 'true' : null" x-bind:class="classes" x-bind:style="placed"
        x-on:pointerdown="down($event)" x-on:pointermove="move($event)" x-on:pointerup="up($event)" x-on:pointercancel="cancel()" x-on:keydown="key($event)" x-on:click.capture="click($event)"
        @if ($spotSide) data-side="{{ $spotSide }}" @endif
        @if ($placedStyle) style="{{ $placedStyle }}" @endif
    @endif
    @if ($shape === 'circle') aria-label="{{ $text }}" @endif
    {{ $attributes->except('data-slot')->cn([
        'z-40 inline-flex items-center justify-center gap-2 bg-primary text-label text-primary-foreground shadow-floating outline-none',
        'transition-[filter,translate] duration-150 ease-nq hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        $placement,
        $spotSide ? '-translate-y-1/2' : $positions[$where],
        $movable ? 'touch-none' : null,
        $shapeClass,
    ]) }}>
    @isset($icon){{ $icon }}@else<x-lucide-message-square-plus aria-hidden="true" class="size-4" />@endisset
    @if ($shape !== 'circle')<span @class(['[writing-mode:vertical-rl] rtl:rotate-180' => $shape === 'tab'])>{{ $text }}</span>@endif
    @if ($count)<span @if ($shape !== 'circle') aria-hidden="true" @endif @class(['inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-caption text-foreground tabular-nums', 'absolute -end-1 -top-1 h-5 border border-border' => $shape === 'circle'])>{{ $count }}</span>@endif
</button>

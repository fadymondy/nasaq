{{-- <x-nq::resizable.handle with-grip />
     The draggable divider between two panels. Focusable: arrow keys resize, Home/End go to the limits, Enter collapses.
     with-grip: show a grip (default false). label: its accessible name (Resize panels / تغيير حجم اللوحات). disabled. --}}
@aware(['orientation' => 'horizontal'])
@props(['withGrip' => false, 'label' => null, 'disabled' => false])
@php
    $horizontal = $orientation !== 'vertical';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'resizable-handle') }}" role="separator" tabindex="0" data-orientation="{{ $orientation }}" aria-orientation="{{ $horizontal ? 'vertical' : 'horizontal' }}"
    aria-label="{{ $label ?? \Nasaq\Nasaq::t('Resize panels', 'تغيير حجم اللوحات') }}"
    data-separator="{{ $disabled ? 'disabled' : 'inactive' }}"
    @if ($disabled) data-disabled @endif
    style="touch-action:none;user-select:none"
    {{ $attributes->except('data-slot')->cn([
        'relative flex shrink-0 items-center justify-center bg-border outline-none transition-colors duration-150 ease-nq',
        $horizontal ? 'w-px after:absolute after:-inset-x-1.5 after:inset-y-0' : 'h-px after:absolute after:-inset-y-1.5 after:inset-x-0',
        'data-[separator=hover]:bg-nq-focus data-[separator=active]:bg-nq-focus',
        'focus-visible:bg-nq-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus',
        'data-[separator=disabled]:pointer-events-none data-[separator=disabled]:opacity-50',
    ]) }}>
    @if ($withGrip)
        <div data-slot="resizable-grip" class="{{ $horizontal ? 'z-10 flex shrink-0 items-center justify-center rounded-control border border-border bg-card text-muted-foreground h-6 w-3' : 'z-10 flex shrink-0 items-center justify-center rounded-control border border-border bg-card text-muted-foreground h-3 w-6' }}">
            @if ($horizontal)
                <x-lucide-grip-vertical data-slot="icon" aria-hidden="true" class="size-2.5" />
            @else
                <x-lucide-grip-horizontal data-slot="icon" aria-hidden="true" class="size-2.5" />
            @endif
        </div>
    @endif
    {{ $slot }}
</div>

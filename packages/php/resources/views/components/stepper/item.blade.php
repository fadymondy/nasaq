{{-- <x-nq::stepper.item title="Workspace" description="Pick a plan" />
     One step. Its status comes from the stepper's current and the item's position. error marks it failed (red marker, "Error" for screen readers).
     A click handler (@click, x-on:click, wire:click) or clickable makes it a button, to go back to a finished step. disabled, status-label
     (overrides the screen-reader status). index: set it yourself when steps are rendered conditionally. --}}
@aware(['current' => 0, 'orientation' => 'horizontal'])
@props(['title' => null, 'description' => null, 'error' => false, 'clickable' => false, 'disabled' => false, 'statusLabel' => null, 'index' => null])
@php
    // Blade renders the items before their stepper, so each one takes the next number from a counter the stepper resets.
    $counter = app()->bound('nq.stepper.index') ? app('nq.stepper.index') : 0;
    app()->instance('nq.stepper.index', $counter + 1);
    $index ??= $counter;
    $ar = \Nasaq\Nasaq::rtl();
    $strings = ['complete' => ['Completed', 'مكتملة'], 'current' => ['Current step', 'الخطوة الحالية'], 'upcoming' => ['Upcoming', 'قادمة'], 'error' => ['Error', 'خطأ']];
    $status = $error ? 'error' : ($index < $current ? 'complete' : ($index === (int) $current ? 'current' : 'upcoming'));
    $vertical = $orientation === 'vertical';
    $handlers = $attributes->whereStartsWith(['@click', 'x-on:click', 'wire:click', 'onclick']);
    $interactive = $clickable || $handlers->isNotEmpty();
    $markerBase = 'relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5';
    $markerByStatus = [
        'complete' => 'border-transparent bg-primary text-primary-foreground',
        'current' => 'border-nq-focus bg-background text-foreground ring-2 ring-nq-focus/30',
        'upcoming' => 'border-border bg-background text-muted-foreground',
        'error' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
    ];
    $titleHtml = $title ?? $slot;
@endphp
<li data-slot="stepper-item" data-status="{{ $status }}"
    {{ $attributes->except(['@click', 'x-on:click', 'wire:click', 'onclick'])->cn([$vertical ? 'grid grid-cols-[1.75rem_1fr] gap-x-3' : 'group/step flex flex-1 items-start last:flex-none']) }}>
    <{{ $interactive ? 'button type="button"' : 'div' }} {{ $handlers }} data-slot="stepper-step"
        @if ($status === 'current' || ($error && $index === (int) $current)) aria-current="step" @endif
        @if ($interactive && $disabled) disabled @endif
        class="{{ \Nasaq\Cn::merge('items-start gap-3 rounded-control text-start outline-none', $vertical ? 'col-span-2 grid grid-cols-subgrid' : 'flex shrink-0', $interactive ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50' : '') }}">
        <span data-slot="stepper-marker" class="{{ \Nasaq\Cn::merge($markerBase, $markerByStatus[$status]) }}">
            @if ($status === 'complete')<x-lucide-check aria-hidden="true" />@elseif ($status === 'error')<x-lucide-x aria-hidden="true" />@else<x-nq::numeric :value="$index + 1" />@endif
        </span>
        <span data-slot="stepper-text" class="flex min-w-0 flex-col text-start">
            <span class="{{ \Nasaq\Cn::merge('text-label', $status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground', $status === 'error' ? 'text-nq-danger-text' : '') }}">
                {{ $titleHtml }}
                <span class="sr-only"> ({{ $statusLabel ?? $strings[$status][$ar ? 1 : 0] }})</span>
            </span>
            @if ($description)<span class="text-caption text-muted-foreground">{{ $description }}</span>@endif
        </span>
    </{{ $interactive ? 'button' : 'div' }}>
    <span aria-hidden="true" data-slot="stepper-connector" @if ($status === 'complete') data-complete="" @endif
        class="{{ \Nasaq\Cn::merge('rounded-full transition-colors duration-150 ease-nq', $status === 'complete' ? 'bg-primary' : 'bg-border', $vertical ? 'col-start-1 row-start-2 my-1 min-h-6 w-px justify-self-center' : 'mx-3 mt-3.5 h-px min-w-6 flex-1', $vertical ? '' : 'group-last/step:hidden') }}"></span>
</li>

{{-- <x-nq::scroll-area aria-label="Notes" class="h-64 w-72"> long content </x-nq::scroll-area>
     A native scroller with a thin scrollbar that shows on hover and while scrolling. Give it a bounded height or width.
     orientation: vertical (default) | horizontal | both. label: accessible name of the scroll region (the viewport is focusable).
     viewport-class: classes for the viewport, e.g. padding. The vertical bar sits on the inline-end edge (left in RTL).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['orientation' => 'vertical', 'label' => null, 'viewportClass' => ''])
<div data-slot="scroll-area" x-data="nqScrollArea()" x-on:pointerenter="hovering = true" x-on:pointerleave="hovering = false"
    {{ $attributes->except('aria-label')->cn('relative min-h-0 min-w-0 overflow-hidden') }}>
    <div data-slot="scroll-area-viewport" x-ref="viewport" role="region" tabindex="0" aria-label="{{ $label ?? $attributes->get('aria-label') }}"
        class="{{ \Nasaq\Cn::merge('size-full overflow-auto rounded-[inherit] outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', $viewportClass) }}">{{ $slot }}</div>
    @if ($orientation !== 'horizontal')
        <div data-slot="scroll-area-scrollbar" data-orientation="vertical" x-ref="barY" x-bind="bar" hidden
            class="absolute flex touch-none select-none p-0.5 opacity-0 transition-opacity duration-150 ease-nq data-hovering:opacity-100 data-scrolling:opacity-100 inset-y-0 end-0 w-2.5">
            <div data-slot="scroll-area-thumb" x-ref="thumbY" x-bind="thumb" class="relative w-full rounded-full bg-nq-line-strong"></div>
        </div>
    @endif
    @if ($orientation !== 'vertical')
        <div data-slot="scroll-area-scrollbar" data-orientation="horizontal" x-ref="barX" x-bind="bar" hidden
            class="absolute flex touch-none select-none p-0.5 opacity-0 transition-opacity duration-150 ease-nq data-hovering:opacity-100 data-scrolling:opacity-100 inset-x-0 bottom-0 h-2.5 flex-col">
            <div data-slot="scroll-area-thumb" x-ref="thumbX" x-bind="thumb" class="relative h-full rounded-full bg-nq-line-strong"></div>
        </div>
    @endif
    @if ($orientation === 'both')
        <div data-slot="scroll-area-corner"></div>
    @endif
</div>

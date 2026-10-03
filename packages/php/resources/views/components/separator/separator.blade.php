{{-- <x-nq::separator />   <x-nq::separator orientation="vertical" />
     orientation: horizontal | vertical --}}
@props(['orientation' => 'horizontal'])
<div data-slot="{{ $attributes->get('data-slot', 'separator') }}" role="separator" data-orientation="{{ $orientation }}"
    @if ($orientation === 'vertical') aria-orientation="vertical" @endif
    {{ $attributes->except('data-slot')->cn(['shrink-0 bg-border', $orientation === 'vertical' ? 'h-4 w-px self-center' : 'h-px w-full']) }}></div>

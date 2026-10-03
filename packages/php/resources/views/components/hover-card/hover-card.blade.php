{{-- <x-nq::hover-card> trigger + content </x-nq::hover-card>
     delay: ms before it opens on hover (default 600). close-delay: ms before it closes (default 300).
     open: start open. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false, 'delay' => 600, 'closeDelay' => 300])
<div data-slot="{{ $attributes->get('data-slot', 'hover-card') }}" x-data="nqHoverCard(@js((int) $delay), @js((int) $closeDelay), @js((bool) $open))" x-modelable="open" {{ $attributes->except('data-slot')->cn('contents') }}>
    {{ $slot }}
</div>

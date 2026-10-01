{{-- <x-nq::input-group.addon align="end"> icon, text or button </x-nq::input-group.addon>
     align: start (default) | end. Logical: end is the left edge in RTL. --}}
@props(['align' => 'start'])
<div data-slot="input-group-addon" data-align="{{ $align }}"
    {{ $attributes->cn([
        'flex h-full shrink-0 items-center gap-1.5 text-body-sm text-muted-foreground [&_svg]:size-4',
        $align === 'start' ? 'order-first ps-3 pe-1' : 'order-last ps-1 pe-3',
    ]) }}>{{ $slot }}</div>

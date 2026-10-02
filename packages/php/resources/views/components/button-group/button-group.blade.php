{{-- <x-nq::button-group aria-label="Period"> <x-nq::button>Day</x-nq::button> <x-nq::button>Week</x-nq::button> </x-nq::button-group>
     Buttons fused into one control: borders are shared and only the outer corners stay round (inline start of the first,
     inline end of the last, so RTL is correct). orientation: horizontal (default) | vertical.
     Children are <x-nq::button>s or <x-nq::button-group.separator />. Give the group an aria-label when it is a set of related actions. --}}
@props(['orientation' => 'horizontal'])
@php
    $b = '[&>[data-slot=button]]';
    $classes = [
        'flex w-fit max-w-full',
        "{$b}:relative {$b}:rounded-none {$b}:focus-visible:z-10 {$b}:hover:z-1",
        $orientation === 'horizontal'
            ? ["{$b}:first-child:rounded-s-control {$b}:last-child:rounded-e-control", "{$b}+{$b}:-ms-px"]
            : ['flex-col', "{$b}:first-child:rounded-t-control {$b}:last-child:rounded-b-control", "{$b}+{$b}:-mt-px"],
    ];
@endphp
<div role="group" data-slot="{{ $attributes->get('data-slot', 'button-group') }}" data-orientation="{{ $orientation }}" {{ $attributes->except('data-slot')->cn(\Illuminate\Support\Arr::flatten($classes)) }}>
    {{ $slot }}
</div>

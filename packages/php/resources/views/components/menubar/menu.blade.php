{{-- <x-nq::menubar.menu> <x-nq::menubar.trigger>File</x-nq::menubar.trigger> <x-nq::menubar.content> items </x-nq::menubar.content> </x-nq::menubar.menu>
     One menu in the bar: a trigger and its content. open: start open (false). --}}
@props(['open' => false])
<div data-slot="{{ $attributes->get('data-slot', 'menubar-menu') }}" x-data="nqMenubarMenu(@js((bool) $open))" x-modelable="open" {{ $attributes->except('data-slot')->cn('contents') }}>{{ $slot }}</div>

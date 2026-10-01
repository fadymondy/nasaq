{{-- <x-nq::dropdown-menu> <x-nq::dropdown-menu.trigger>Actions</x-nq::dropdown-menu.trigger> <x-nq::dropdown-menu.content> items </x-nq::dropdown-menu.content> </x-nq::dropdown-menu>
     Parts: trigger, content, item (variant="danger", shortcut, disabled), checkbox-item, radio-group + radio-item, group, label, separator, shortcut, sub + sub-trigger + sub-content.
     open: start open (false). open is x-modelable: x-model="$wire.menuOpen". Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="dropdown-menu" x-data="nqDropdownMenu(@js((bool) $open))" x-modelable="open" {{ $attributes->cn('contents') }}>{{ $slot }}</div>

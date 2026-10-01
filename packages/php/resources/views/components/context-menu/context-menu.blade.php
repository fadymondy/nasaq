{{-- <x-nq::context-menu> <x-nq::context-menu.trigger class="…">Right-click me</x-nq::context-menu.trigger> <x-nq::context-menu.content> items </x-nq::context-menu.content> </x-nq::context-menu>
     Parts: trigger (the region), content, item (variant="danger", shortcut, disabled), checkbox-item, radio-group + radio-item, group, label, separator, shortcut, sub + sub-trigger + sub-content.
     open: start open (false). open is x-modelable. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="context-menu" x-data="nqContextMenu(@js((bool) $open))" x-modelable="open" {{ $attributes->cn('contents') }}>{{ $slot }}</div>

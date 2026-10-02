{{-- <x-nq::menubar aria-label="Application"> <x-nq::menubar.menu> <x-nq::menubar.trigger>File</x-nq::menubar.trigger> <x-nq::menubar.content> items </x-nq::menubar.content> </x-nq::menubar.menu> </x-nq::menubar>
     A desktop-style bar of menus. ArrowLeft and ArrowRight (swapped in RTL) move between the triggers; with a menu open they open the neighbour. Hovering a trigger while one is open switches to it.
     Parts: menu, trigger, content, item (variant="danger", shortcut string or array, disabled), checkbox-item, radio-group + radio-item, group, label, separator, shortcut, sub + sub-trigger + sub-content.
     Needs the Alpine runtime (@nasaqScripts). --}}
<div data-slot="{{ $attributes->get('data-slot', 'menubar') }}" x-data="nqMenubar()" x-bind="bar"
    {{ $attributes->except('data-slot')->cn('flex h-control w-fit items-center gap-0.5 rounded-control border border-border bg-card p-0.5 text-foreground') }}>{{ $slot }}</div>

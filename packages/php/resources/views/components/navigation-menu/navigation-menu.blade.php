{{-- <x-nq::navigation-menu> <x-nq::navigation-menu.list> <x-nq::navigation-menu.item value="products"> trigger + content </x-nq::navigation-menu.item> </x-nq::navigation-menu.list> </x-nq::navigation-menu>
     A site header menu. Each item with a panel needs a value shared by its trigger and content (they read it from the item).
     value: the panel open on first paint. align: where the panel sits against its trigger, start (default) | center | end.
     Deviation from React: each item owns its panel (no shared animated viewport), so panels fade and scale rather than resize between triggers.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'align' => 'start'])
<nav data-slot="navigation-menu" x-data="nqNavigationMenu(@js($value))" x-bind="root" data-align="{{ $align }}"
    {{ $attributes->cn(['relative flex w-max max-w-full']) }}>
    {{ $slot }}
</nav>

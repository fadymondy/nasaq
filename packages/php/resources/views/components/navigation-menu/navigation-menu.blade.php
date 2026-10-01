{{-- <x-nq::navigation-menu> <x-nq::navigation-menu.list> <x-nq::navigation-menu.item value="products"> trigger + content </x-nq::navigation-menu.item> </x-nq::navigation-menu.list> </x-nq::navigation-menu>
     A site header menu. Each item with a panel needs a value shared by its trigger and content (they read it from the item).
     value: the panel open on first paint. align: where the panel sits against its trigger, start (default) | center | end.
     side-offset: gap in px between the bar and the panel (default 8). panel-class: extra classes for the panel.
     Like React there is ONE shared panel under the bar (positioner > popup > viewport): the Alpine runtime moves the open
     content into it, resizes it (--popup-width / --popup-height) and slides the content with data-activation-direction.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'align' => 'start', 'sideOffset' => 8, 'panelClass' => null])
<nav data-slot="navigation-menu" x-data="nqNavigationMenu(@js($value))" x-bind="root" data-align="{{ $align }}"
    {{ $attributes->cn(['relative flex w-max max-w-full']) }}>
    {{ $slot }}
    <div data-slot="navigation-menu-positioner" data-side="bottom" data-align="{{ $align }}" style="display: none; margin-top: {{ (int) $sideOffset }}px; --available-width: calc(100vw - 2rem)"
        class="absolute left-0 top-full z-50 h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[inset] duration-300 ease-nq motion-reduce:transition-none data-instant:transition-none before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-['']">
        <div data-slot="navigation-menu-popup" style="--transform-origin: top"
            class="{{ Nasaq\Cn::merge('relative h-[var(--popup-height)] w-[var(--popup-width)] origin-[var(--transform-origin)] overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none transition-[opacity,scale,width,height] duration-300 ease-nq motion-reduce:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150', (string) ($panelClass ?? '')) }}">
            <div data-slot="navigation-menu-viewport" class="relative h-full w-full overflow-hidden"></div>
        </div>
    </div>
</nav>

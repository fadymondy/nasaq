{{-- <x-nq::app-shell.crumb href="/acme" tag-variant="outline"> <x-slot:icon>...</x-slot:icon> Acme <x-slot:tag>Pro</x-slot:tag> <x-slot:menu> dropdown-menu items </x-slot:menu> </x-nq::app-shell.crumb>
     One step of the path: an optional mark (icon slot), the name, a tag (tag slot) and a switcher (menu slot: the dropdown-menu items for the up-down button beside the name; needs Alpine).
     href links the name; current marks the last step (not a link). menu-label: the switcher's name (default "Switch {name}"). --}}
@props(['href' => null, 'current' => false, 'tagVariant' => 'outline', 'menuLabel' => null, 'icon' => null, 'tag' => null, 'menu' => null])
@php
    $name = trim(preg_replace('/\s+/', ' ', strip_tags((string) $slot)));
    $hasIcon = $icon !== null && ! $icon->isEmpty();
    $labelClass = 'flex h-8 min-w-0 items-center gap-2 rounded-control px-1.5 text-label text-foreground outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
@endphp
<li class="group/crumb flex min-w-0 items-center gap-1 max-md:not-last:hidden">
    <span aria-hidden="true" class="select-none px-0.5 text-body text-nq-line-strong group-first/crumb:hidden max-md:hidden">/</span>
    <span data-slot="app-crumb" {{ $attributes->cn('flex min-w-0 items-center gap-1') }}>
        @if ($href && ! $current)
            <a href="{{ $href }}" class="{{ $labelClass }} transition-colors duration-150 ease-nq hover:bg-nq-hover">
                @if ($hasIcon)<span class="inline-flex shrink-0 [&_svg]:size-4">{{ $icon }}</span>@endif
                <span class="truncate">{{ $slot }}</span>
            </a>
        @else
            <span @if ($current) aria-current="page" @endif class="{{ $labelClass }}">
                @if ($hasIcon)<span class="inline-flex shrink-0 [&_svg]:size-4">{{ $icon }}</span>@endif
                <span class="truncate">{{ $slot }}</span>
            </span>
        @endif
        @if ($tag !== null && ! $tag->isEmpty())<x-nq::badge :variant="$tagVariant" class="shrink-0 uppercase">{{ $tag }}</x-nq::badge>@endif
        @if ($menu !== null && ! $menu->isEmpty())
            <x-nq::dropdown-menu>
                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" aria-label="{{ $menuLabel ?? \Nasaq\Nasaq::t('Switch '.$name, 'تبديل '.$name) }}"
                    class="size-6 shrink-0 text-muted-foreground data-popup-open:bg-nq-selected"><x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5" /></x-nq::dropdown-menu.trigger>
                <x-nq::dropdown-menu.content align="start" class="w-64">{{ $menu }}</x-nq::dropdown-menu.content>
            </x-nq::dropdown-menu>
        @endif
    </span>
</li>

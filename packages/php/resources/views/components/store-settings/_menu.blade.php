{{-- Internal: the row menu of the store-settings lists. A "..." button plus a context menu (right-click, long-press, Menu key), both with the same items.
     @include('nasaq::components.store-settings._menu', ['items' => [['icon' => 'pencil', 'label' => 'Edit', 'on' => 'openZone(z)', 'danger' => false, 'sep' => false, 'if' => null]], 'aria' => '`Actions, ${z.name}`', 'slotName' => 'zone-actions'])
     Put it inside an element that has x-data="nqContextMenu()" x-bind="trigger". 'if' is an Alpine expression that shows the item only when true. --}}
@php
    $menu = 'fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
    $items = array_values((array) ($items ?? []));
@endphp
@if (count($items) > 0)
    <x-nq::dropdown-menu>
        <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="{{ $slotName ?? 'row-actions' }}" x-bind:aria-label="{{ $aria }}" class="text-muted-foreground data-popup-open:text-foreground">
            <x-lucide-ellipsis aria-hidden="true" />
        </x-nq::dropdown-menu.trigger>
        <x-nq::dropdown-menu.content align="end" class="min-w-44">
            @foreach ($items as $i)
                @if (! empty($i['sep']))<x-nq::dropdown-menu.separator />@endif
                @if (! empty($i['if']))<template x-if="{{ $i['if'] }}">@endif
                <x-nq::dropdown-menu.item :variant="! empty($i['danger']) ? 'danger' : 'default'" x-on:click="{{ $i['on'] }}"><x-dynamic-component :component="'lucide-'.$i['icon']" aria-hidden="true" />{{ $i['label'] }}</x-nq::dropdown-menu.item>
                @if (! empty($i['if']))</template>@endif
            @endforeach
        </x-nq::dropdown-menu.content>
    </x-nq::dropdown-menu>
    <template x-teleport="body">
        <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" class="{{ $menu }}">
            @foreach ($items as $i)
                @if (! empty($i['sep']))<x-nq::context-menu.separator />@endif
                @if (! empty($i['if']))<template x-if="{{ $i['if'] }}">@endif
                <x-nq::context-menu.item :variant="! empty($i['danger']) ? 'danger' : 'default'" x-on:click="{{ $i['on'] }}"><x-dynamic-component :component="'lucide-'.$i['icon']" aria-hidden="true" />{{ $i['label'] }}</x-nq::context-menu.item>
                @if (! empty($i['if']))</template>@endif
            @endforeach
        </div>
    </template>
@endif

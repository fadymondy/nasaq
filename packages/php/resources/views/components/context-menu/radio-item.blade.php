{{-- <x-nq::context-menu.radio-item value="asc">Ascending</x-nq::context-menu.radio-item>
     One choice inside radio-group. A click does not close the menu unless close-on-click. --}}
@props(['value', 'disabled' => false, 'closeOnClick' => false])
<div data-slot="{{ $attributes->get('data-slot', 'context-menu-radio-item') }}" role="menuitemradio" x-bind="item"
    x-on:click="if (! $el.hasAttribute('data-disabled')) value = @js((string) $value)"
    x-bind:aria-checked="value === @js((string) $value) ? 'true' : 'false'" x-bind:data-checked="value === @js((string) $value) ? '' : undefined" x-bind:data-unchecked="value === @js((string) $value) ? undefined : ''"
    @unless ($closeOnClick) data-keep-open @endunless
    @if ($disabled) data-disabled aria-disabled="true" @endif
    {{ $attributes->except('data-slot')->cn([
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control px-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
        'ps-8',
    ]) }}>
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <span x-show="value === @js((string) $value)" style="display:none" class="block size-1.5 rounded-full bg-current"></span>
    </span>
    {{ $slot }}
</div>

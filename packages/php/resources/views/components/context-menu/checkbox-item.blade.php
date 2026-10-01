{{-- <x-nq::context-menu.checkbox-item :checked="true">Show grid</x-nq::context-menu.checkbox-item>
     A toggle. checked: initial state (x-modelable: x-model="$wire.grid"). A click does not close the menu unless close-on-click. --}}
@props(['checked' => false, 'disabled' => false, 'closeOnClick' => false])
<div data-slot="context-menu-checkbox-item" role="menuitemcheckbox" x-data="{ checked: @js((bool) $checked) }" x-modelable="checked" x-bind="item"
    x-on:click="if (! $el.hasAttribute('data-disabled')) checked = ! checked"
    x-bind:aria-checked="checked ? 'true' : 'false'" x-bind:data-checked="checked ? '' : undefined" x-bind:data-unchecked="checked ? undefined : ''"
    @unless ($closeOnClick) data-keep-open @endunless
    @if ($disabled) data-disabled aria-disabled="true" @endif
    {{ $attributes->cn([
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control px-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
        'ps-8',
    ]) }}>
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <span x-show="checked" class="contents" @unless ($checked) style="display:none" @endunless><x-lucide-check /></span>
    </span>
    {{ $slot }}
</div>

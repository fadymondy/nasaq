{{-- <x-nq::accordion.trigger>Can I change my plan later?</x-nq::accordion.trigger>
     Header + trigger in one: a full-width button with the title at the inline start and a chevron that turns when open. --}}
@aware(['value', 'defaultValue' => [], 'multiple' => false, 'disabled' => false])
@php($open = in_array((string) $value, array_map('strval', array_slice(array_values((array) $defaultValue), 0, $multiple ? null : 1)), true))
<h3 data-slot="accordion-header" class="m-0 flex">
    <button type="button" data-slot="accordion-trigger" x-on:click="toggle(v)"
        :id="$id('nq-accordion', 'trigger-' + v)" :aria-controls="$id('nq-accordion', 'panel-' + v)"
        :aria-expanded="isOpen(v)" :data-panel-open="isOpen(v) ? '' : undefined"
        aria-expanded="{{ $open ? 'true' : 'false' }}" @if ($open) data-panel-open @endif
        @if ($disabled) disabled data-disabled @endif
        {{ $attributes->cn([
            'group flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-label text-foreground outline-none',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            'data-disabled:pointer-events-none data-disabled:opacity-50',
        ]) }}>
        {{ $slot }}
        <x-nq::icon name="chevron-down" class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-nq motion-reduce:transition-none group-data-panel-open:rotate-180" />
    </button>
</h3>

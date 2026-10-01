{{-- <x-nq::select.trigger> <x-nq::select.value /> </x-nq::select.trigger>
     The Field-style button that opens the list. invalid: marks it invalid (data-invalid + aria-invalid). --}}
@props(['invalid' => false])
<button data-slot="select-trigger" x-ref="trigger" x-bind="trigger"
    @if ($invalid) data-invalid aria-invalid="true" @endif
    {{ $attributes->cn([
        'flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground',
        'min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus',
        'data-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50',
        'pointer-coarse:text-[16px]',
    ]) }}>
    {{ $slot }}
    <span class="flex shrink-0 text-muted-foreground [&_svg]:size-4"><x-lucide-chevrons-up-down /></span>
</button>

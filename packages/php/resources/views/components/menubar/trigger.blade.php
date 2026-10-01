{{-- <x-nq::menubar.trigger>File</x-nq::menubar.trigger> A bar button that opens its menu. ArrowDown, Enter or Space open it with the first item focused. --}}
@props(['disabled' => false])
<button type="button" data-slot="menubar-trigger" x-ref="trigger" x-bind="trigger"
    @if ($disabled) disabled data-disabled @endif
    {{ $attributes->cn([
        'inline-flex h-full min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center rounded-control px-2.5 text-label text-foreground outline-none',
        'hover:bg-nq-hover data-popup-open:bg-nq-selected focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
    ]) }}>{{ $slot }}</button>

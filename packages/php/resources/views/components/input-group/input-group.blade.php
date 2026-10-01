{{-- <x-nq::input-group> addons + <x-nq::input-group.input> </x-nq::input-group>
     The bordered shell: it owns the border, height, focus ring and invalid state so addons and the input read as one
     control. DOM order is visual order and mirrors in RTL. --}}
<div role="group" data-slot="input-group"
    {{ $attributes->cn([
        'group/input-group flex h-control min-h-[var(--nq-touch-min,0px)] w-full min-w-0 items-center overflow-hidden rounded-control border border-input bg-card text-body text-foreground',
        'transition-colors duration-150 ease-nq',
        'focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus',
        'has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger',
        'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50',
    ]) }}>{{ $slot }}</div>

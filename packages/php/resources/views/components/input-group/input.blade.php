{{-- <x-nq::input-group.input ltr placeholder="nasaq.app" />
     The borderless input; every input attribute (name, type, wire:model, x-model …) passes through. ltr forces left-to-right (URLs, emails). --}}
@props(['ltr' => false])
<input data-slot="input-group-input" @if ($ltr) dir="ltr" @endif
    {{ $attributes->cn([
        'h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-body text-foreground outline-none',
        'placeholder:text-muted-foreground disabled:cursor-not-allowed',
        'pointer-coarse:text-[16px]',
        $ltr ? 'text-start' : '',
    ]) }} />

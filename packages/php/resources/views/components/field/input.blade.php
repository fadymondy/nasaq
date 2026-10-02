{{-- <x-nq::field.input placeholder="Nasaq" />   <x-nq::field.input type="email" ltr />
     The Nasaq text input. ltr forces left-to-right entry and text-start alignment (emails, URLs, codes, phone numbers in Arabic forms).
     Works standalone or inside <x-nq::field> (which wires the label, description, error and invalid state). --}}
@aware(['invalid' => false, 'disabled' => false, 'name' => null])
@props(['ltr' => false, 'type' => 'text'])
<input data-slot="{{ $attributes->get('data-slot', 'input') }}" type="{{ $type }}"
    @if ($ltr) dir="ltr" @endif
    @if (($name ?? null) && ! $attributes->has('name')) name="{{ $name }}" @endif
    @if ($invalid ?? false) data-invalid aria-invalid="true" @endif
    @if ($disabled ?? false) disabled @endif
    {{ $attributes->except('data-slot')->cn([
        'w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground',
        'min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
        'data-invalid:border-nq-danger aria-invalid:border-nq-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // 16px on coarse pointers so iOS does not zoom on focus.
        'pointer-coarse:text-[16px]',
        'h-control',
        'text-start' => $ltr,
    ]) }}>

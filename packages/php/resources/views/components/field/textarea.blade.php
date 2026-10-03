{{-- <x-nq::field.textarea rows="4" />  A Field control rendered as a <textarea>; label, description, error and invalid wire up like the input. --}}
@aware(['invalid' => false, 'disabled' => false, 'name' => null])
<textarea data-slot="{{ $attributes->get('data-slot', 'textarea') }}"
    @if ($name && ! $attributes->has('name')) name="{{ $name }}" @endif
    @if ($invalid) data-invalid aria-invalid="true" @endif
    @if ($disabled) disabled @endif
    {{ $attributes->except('data-slot')->cn([
        'w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground',
        'min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
        'data-invalid:border-nq-danger aria-invalid:border-nq-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // 16px on coarse pointers so iOS does not zoom on focus.
        'pointer-coarse:text-[16px]',
        'min-h-20 py-2',
    ]) }}>{{ $slot }}</textarea>

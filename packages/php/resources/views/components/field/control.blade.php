{{-- <x-nq::field.control />  The unstyled Field control: a bare <input> that joins the field (id, aria-describedby, invalid). Pass your own classes. --}}
@aware(['invalid' => false, 'disabled' => false, 'name' => null])
<input data-slot="{{ $attributes->get('data-slot', 'field-control') }}"
    @if ($name && ! $attributes->has('name')) name="{{ $name }}" @endif
    @if ($invalid) data-invalid aria-invalid="true" @endif
    @if ($disabled) disabled @endif
    {{ $attributes->except('data-slot') }}>

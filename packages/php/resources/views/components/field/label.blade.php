{{-- <x-nq::field.label>Project name</x-nq::field.label>  Its `for` follows the field's control automatically. Dims with the field's disabled state. --}}
@aware(['disabled' => false])
<label data-slot="field-label" @if ($disabled) data-disabled @endif {{ $attributes->cn('text-label text-foreground data-disabled:opacity-50') }}>{{ $slot }}</label>

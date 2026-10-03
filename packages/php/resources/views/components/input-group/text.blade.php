{{-- <x-nq::input-group.text dir="ltr">https://</x-nq::input-group.text>: a text affix for units and protocols. --}}
<span data-slot="{{ $attributes->get('data-slot', 'input-group-text') }}" {{ $attributes->except('data-slot')->cn('select-none whitespace-nowrap') }}>{{ $slot }}</span>

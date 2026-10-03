{{-- <x-nq::table.body> rows </x-nq::table.body> --}}
<tbody data-slot="{{ $attributes->get('data-slot', 'table-body') }}" {{ $attributes->except('data-slot')->cn('[&_tr:last-child]:border-0') }}>{{ $slot }}</tbody>

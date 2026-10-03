{{-- <x-nq::table.header> <x-nq::table.row> head cells </x-nq::table.row> </x-nq::table.header> --}}
<thead data-slot="{{ $attributes->get('data-slot', 'table-header') }}" {{ $attributes->except('data-slot')->cn('[&_tr]:border-b [&_tr]:hover:bg-transparent [&_tr]:even:bg-transparent') }}>{{ $slot }}</thead>

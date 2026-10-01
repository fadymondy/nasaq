{{-- <x-nq::table.header> <x-nq::table.row> head cells </x-nq::table.row> </x-nq::table.header> --}}
<thead data-slot="table-header" {{ $attributes->cn('[&_tr]:border-b [&_tr]:hover:bg-transparent [&_tr]:even:bg-transparent') }}>{{ $slot }}</thead>

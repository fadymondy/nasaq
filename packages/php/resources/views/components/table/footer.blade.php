{{-- <x-nq::table.footer> totals row </x-nq::table.footer> --}}
<tfoot data-slot="{{ $attributes->get('data-slot', 'table-footer') }}" {{ $attributes->except('data-slot')->cn('border-t bg-secondary/50 font-medium [&_tr]:even:bg-transparent') }}>{{ $slot }}</tfoot>

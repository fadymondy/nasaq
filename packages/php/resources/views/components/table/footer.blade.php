{{-- <x-nq::table.footer> totals row </x-nq::table.footer> --}}
<tfoot data-slot="table-footer" {{ $attributes->cn('border-t bg-secondary/50 font-medium [&_tr]:even:bg-transparent') }}>{{ $slot }}</tfoot>

{{-- <x-nq::table.cell>MH-728</x-nq::table.cell> --}}
@aware(['density' => 'default'])
@php
    $pad = ['compact' => 'px-2 py-1', 'default' => 'px-4 py-3', 'comfortable' => 'px-5 py-4'][$density] ?? 'px-4 py-3';
@endphp
<td data-slot="table-cell" {{ $attributes->cn(['h-row align-middle whitespace-nowrap', $pad]) }}>{{ $slot }}</td>

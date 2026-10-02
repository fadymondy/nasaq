{{-- <x-nq::table.head>Key</x-nq::table.head>   <x-nq::table.head class="text-end">Hours</x-nq::table.head> --}}
@aware(['density' => 'default'])
@props(['scope' => 'col'])
@php
    $pad = ['compact' => 'px-2 py-1', 'default' => 'px-4 py-3', 'comfortable' => 'px-5 py-4'][$density] ?? 'px-4 py-3';
@endphp
<th data-slot="{{ $attributes->get('data-slot', 'table-head') }}" scope="{{ $scope }}" {{ $attributes->except('data-slot')->cn(['h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground', $pad]) }}>{{ $slot }}</th>

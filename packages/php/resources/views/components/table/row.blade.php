{{-- <x-nq::table.row data-state="selected"> cells </x-nq::table.row>
     data-state="selected" tints the row and sets aria-selected. --}}
@aware(['hover' => true, 'striped' => false])
@php $selected = $attributes->get('data-state') === 'selected'; @endphp
<tr data-slot="table-row" @if ($selected) aria-selected="true" @endif
    {{ $attributes->cn([
        'border-b border-border transition-colors duration-150 ease-nq',
        'even:bg-secondary/40' => $striped,
        'hover:bg-nq-hover' => $hover,
        'data-[state=selected]:bg-nq-selected',
    ]) }}>{{ $slot }}</tr>

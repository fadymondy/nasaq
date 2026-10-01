{{-- <x-nq::select.label>Group name</x-nq::select.label> Put it inside a select.group. --}}
<div data-slot="{{ $attributes->get('data-slot', 'select-label') }}" {{ $attributes->except('data-slot')->cn('px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground') }}>{{ $slot }}</div>

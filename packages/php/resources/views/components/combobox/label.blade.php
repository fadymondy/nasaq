{{-- <x-nq::combobox.label>Group name</x-nq::combobox.label> Put it inside a combobox.group. --}}
<div data-slot="combobox-label" {{ $attributes->cn('px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground') }}>{{ $slot }}</div>

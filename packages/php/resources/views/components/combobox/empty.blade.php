{{-- <x-nq::combobox.empty>No results</x-nq::combobox.empty> Shown only when the filter leaves no items. Localise the copy. --}}
<div data-slot="combobox-empty" x-bind="emptyState" {{ $attributes->cn('px-2.5 py-2 text-body-sm text-muted-foreground empty:hidden') }}>{{ $slot }}</div>

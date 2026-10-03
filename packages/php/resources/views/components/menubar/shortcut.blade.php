{{-- <x-nq::menubar.shortcut :keys="['Ctrl', 'S']" /> <x-nq::menubar.shortcut>⌘S</x-nq::menubar.shortcut>
     A shortcut as key caps at the inline end (always left to right): a keys list, or the slot as one cap. --}}
@props(['keys' => null])
<span data-slot="{{ $attributes->get('data-slot', 'menubar-shortcut') }}" dir="ltr" {{ $attributes->except('data-slot')->cn('ms-auto inline-flex items-center gap-1 ps-6') }}>
    @if ($keys)
        @foreach ((array) $keys as $key)<x-nq::text.kbd>{{ $key }}</x-nq::text.kbd>@endforeach
    @elseif (! $slot->isEmpty())
        <x-nq::text.kbd>{{ $slot }}</x-nq::text.kbd>
    @endif
</span>

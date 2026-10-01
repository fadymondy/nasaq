{{-- <x-nq::hover-card.trigger href="/people/sara">@sara</x-nq::hover-card.trigger>
     A link by default; as="button" for a button. Opens on hover or keyboard focus, never on touch. --}}
@props(['as' => 'a'])
<{{ $as }} data-slot="hover-card-trigger" x-ref="trigger" x-bind="trigger" {{ $attributes }}>{{ $slot }}</{{ $as }}>

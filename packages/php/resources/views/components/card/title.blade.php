{{-- <x-nq::card.title as="h3">Title</x-nq::card.title>   as: div (default) | h1 .. h6, so the card is a navigable section. --}}
@props(['as' => 'div'])
<{{ $as }} data-slot="card-title" {{ $attributes->cn('text-label text-foreground') }}>{{ $slot }}</{{ $as }}>

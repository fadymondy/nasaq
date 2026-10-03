{{-- <x-nq::card class="max-w-sm">
       <x-nq::card.header><x-nq::card.title>Title</x-nq::card.title><x-nq::card.description>About</x-nq::card.description>
         <x-nq::card.action>...</x-nq::card.action></x-nq::card.header>
       <x-nq::card.content>Body</x-nq::card.content><x-nq::card.footer>...</x-nq::card.footer>
     </x-nq::card> --}}
<div data-slot="{{ $attributes->get('data-slot', 'card') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground') }}>{{ $slot }}</div>

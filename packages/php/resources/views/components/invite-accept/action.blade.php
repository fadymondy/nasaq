{{-- <x-nq::invite-accept.action variant="primary" :to="$url" event="nq-invite-sign-in">Sign in</x-nq::invite-accept.action>
     One of invite-accept's navigation buttons: a link button when `to` is a URL, else a button that fires `event` from the page. --}}
@props(['to' => true, 'event', 'variant' => 'primary'])
@if (is_string($to))
    <x-nq::button :variant="$variant" :href="$to" {{ $attributes }}>{{ $slot }}</x-nq::button>
@else
    <x-nq::button :variant="$variant" x-on:click="emit('{{ $event }}')" {{ $attributes }}>{{ $slot }}</x-nq::button>
@endif

{{-- <x-nq::drawer> trigger + content </x-nq::drawer>
     A bottom drawer for touch screens: slides up, has a drag handle and closes when you swipe it down.
     Use <x-nq::sheet> for side panels. open: start open (x-modelable, so wire:model and x-model work).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['open' => false])
<div data-slot="drawer" x-data="nqDrawer(@js((bool) $open))" x-modelable="open" x-id="['nq-dialog']" {{ $attributes->cn('contents') }}>
    {{ $slot }}
</div>

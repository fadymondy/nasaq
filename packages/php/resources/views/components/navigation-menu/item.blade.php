{{-- <x-nq::navigation-menu.item value="products"> trigger + content </x-nq::navigation-menu.item>   a plain link item needs no value. --}}
@props(['value' => null])
<li data-slot="navigation-menu-item" {{ $attributes->cn(['relative']) }}>{{ $slot }}</li>

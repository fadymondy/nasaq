{{-- <x-nq::detail-layout.panel key="logs"> ... </x-nq::detail-layout.panel>
     The content of one tab inside <x-nq::detail-layout>: shown only while that tab is active (Alpine x-show on the layout scope).
     key: the tab key. active: render it visible on the server (default false; set it on the tab that starts active). --}}
@props(['key', 'active' => false])
<div data-slot="{{ $attributes->get('data-slot', 'detail-panel') }}" x-show="active === @js((string) $key)" @unless ($active) style="display: none" @endunless {{ $attributes->except('data-slot') }}>{{ $slot }}</div>

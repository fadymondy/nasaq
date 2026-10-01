{{-- <x-nq::tabs.panel value="board">Board view</x-nq::tabs.panel> --}}
@aware(['defaultValue' => null])
@props(['value'])
<div data-slot="tabs-panel" x-bind="panel(@js($value))"
    @if ($defaultValue !== null && (string) $defaultValue !== (string) $value) hidden @endif
    {{ $attributes->cn('outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus') }}>{{ $slot }}</div>

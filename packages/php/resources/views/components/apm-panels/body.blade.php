{{-- Internal: what every APM panel shows in place of its body while it is failing, loading or empty; otherwise its slot.
     error: string or true. loading, empty: bool. retry: draws the retry button (dispatches "nq-retry"). t: the words. height: Tailwind height, e.g. "h-64". --}}
@props(['error' => null, 'loading' => false, 'empty' => false, 'retry' => false, 't', 'height' => 'h-64'])
@if ($error)
    <x-nq::states.error :title="is_string($error) ? $error : $t['loadError']">
        @if ($retry)
            <x-slot:actions><x-nq::button size="sm" x-data x-on:click="$dispatch('nq-retry', {})">{{ $t['retry'] }}</x-nq::button></x-slot:actions>
        @endif
    </x-nq::states.error>
@elseif ($loading)
    <x-nq::states.skeleton class="w-full {{ $height }}" />
@elseif ($empty)
    <div class="grid place-items-center text-body-sm text-muted-foreground {{ $height }}">{{ $t['empty'] }}</div>
@else
    {{ $slot }}
@endif

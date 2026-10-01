{{-- <x-nq::countdown.cycle-dots :total="4" :done="1" active />
     One dot per focus session in the set. Filled dots are done; the next one is ringed while a session runs (active).
     Inside <x-nq::countdown>, add live: total, done and active then come from the timer (total / done on <x-nq::countdown>, active while it runs). --}}
@props(['total' => 0, 'done' => 0, 'active' => false, 'live' => false])
@php
    $count = max(0, (int) $total);
    $finished = min($count, max(0, (int) $done));
    $base = 'size-2.5 rounded-full border transition-colors duration-200 ease-nq motion-reduce:transition-none';
    $styles = ['done' => 'border-primary bg-primary', 'current' => 'border-primary bg-transparent ring-2 ring-primary/30', 'todo' => 'border-nq-line-strong bg-transparent'];
    $label = \Nasaq\Nasaq::t("{$finished} of {$count} focus sessions done in this set", "{$finished} من {$count} جلسات تركيز أُنجزت في هذه الدورة");
@endphp
<div data-slot="cycle-dots" role="img" @if ($live) :aria-label="cyclesLabel()" @else aria-label="{{ $label }}" @endif {{ $attributes->cn('inline-flex items-center gap-2') }}>
    @for ($i = 0; $i < $count; $i++)
        @php $state = $i < $finished ? 'done' : ($active && $i === $finished ? 'current' : 'todo'); @endphp
        @if ($live)
            <span :data-state="dotState({{ $i }})" :class="dotClass({{ $i }})"></span>
        @else
            <span data-state="{{ $state }}" class="{{ \Nasaq\Cn::merge($base, $styles[$state]) }}"></span>
        @endif
    @endfor
</div>

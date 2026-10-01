{{-- <x-nq::countdown :duration-ms="1500000" :total="4" :done="1"> ring + readout + dots + your buttons </x-nq::countdown>
     The timer scope: a drift-free countdown (it stores the moment it ends, so a late tick never skews it). Put the parts inside it with the
     live attribute (<x-nq::countdown.timer-ring live>, <x-nq::countdown.timer-readout live>, <x-nq::countdown.cycle-dots live>) and drive it with
     x-on:click="start()" / pause() / resume() / reset() (start(ms) takes a new length). status is "idle" | "running" | "paused" | "done".
     duration-ms: length in milliseconds. auto-start. speed runs the clock faster, for demos. total / done: the cycle dots (setDone(n) moves them).
     @countdown-complete fires once at zero. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['durationMs' => 0, 'autoStart' => false, 'speed' => 1, 'total' => 0, 'done' => 0])
@php
    $options = array_filter(['autoStart' => $autoStart ?: null, 'speed' => $speed != 1 ? $speed : null, 'total' => $total ?: null, 'done' => $done ?: null], fn ($v) => $v !== null);
@endphp
<div data-slot="countdown" x-data="nqCountdown({{ (int) $durationMs }}, {!! \Illuminate\Support\Js::from((object) $options) !!})" {{ $attributes->cn('contents') }}>{{ $slot }}</div>

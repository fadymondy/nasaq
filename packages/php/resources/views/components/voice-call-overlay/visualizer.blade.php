{{-- <x-nq::voice-call-overlay.visualizer state="listening" :level="0.5" />   <x-nq::voice-call-overlay.visualizer state-expr="callState" level-expr="callLevel" muted-expr="callMuted" />
     A row of bars shaped by the last moments of the voice. Listening uses the ink colour, speaking the accent; while the agent is thinking the bars breathe on their own. Under reduced motion nothing
     animates and the level moves in coarse steps. It never asks for the microphone: it only draws the level it is given (0 to 1; drive it from an analyser or, in a demo, a timer).
     state: connecting | listening | thinking | speaking | error. level: 0 to 1. bars: how many (31). muted: flat and dim (the microphone is muted). state-expr, level-expr, muted-expr: Alpine
     expressions re-read whenever they change. level is also x-modelable (x-model; the data is named vizLevel inside). labels: words (level). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.voice-call-overlay._logic')
@props(['state' => 'listening', 'level' => 0, 'bars' => 31, 'muted' => false, 'labels' => [], 'stateExpr' => null, 'levelExpr' => null, 'mutedExpr' => null])
@php
    $t = nq_voice_words($labels);
    $bars = max(1, (int) $bars);
    $half = (int) ceil($bars / 2);
    $quiet = $muted && $state === 'listening';
    $live = ($state === 'listening' && ! $quiet) || $state === 'speaking';
    $target = $live ? nq_voice_clamp($level) : 0.0;
    $heights = nq_voice_heights(nq_voice_push(nq_voice_push([], 0, $half), $target, $half), $bars, $state === 'thinking' ? 0.16 : 0.06);
    $barClass = nq_voice_bar_class($state, $quiet);
    $config = \Illuminate\Support\Js::from(['state' => $state, 'level' => (float) $level, 'bars' => $bars, 'muted' => (bool) $muted])->toHtml();
    $parts = array_filter([
        $stateExpr !== null ? 'state: '.e($stateExpr) : null,
        $levelExpr !== null ? 'level: '.e($levelExpr) : null,
        $mutedExpr !== null ? 'muted: '.e($mutedExpr) : null,
    ]);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'voice-visualizer') }}" role="meter" aria-label="{{ $t['level'] }}" aria-valuemin="0" aria-valuemax="100" x-data="nqVoiceVisualizer({!! $config !!})" x-modelable="vizLevel"
    x-bind:data-state="vizState" x-bind:aria-valuenow="meter()"@if ($parts) x-effect="sync({ {!! implode(', ', $parts) !!} })"@endif
    {{ $attributes->except('data-slot')->cn('flex h-28 items-center justify-center gap-1') }}>
    @foreach ($heights as $i => $h)
        <span aria-hidden="true" class="{{ $barClass }}" style="height: {{ round($h * 100, 3) }}%"></span>
    @endforeach
</div>

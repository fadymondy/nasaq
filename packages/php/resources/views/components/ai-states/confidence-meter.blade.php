{{-- <x-nq::ai-states.confidence-meter :value="0.86" />
     How sure the model is: a small bar, the level as a word and the percentage. Never colour alone. value: 0 to 1 (high from 0.8, medium from 0.5, low below). labels: words (confidence, high, medium, low). --}}
@include('nasaq::components.ai-states._logic')
@props(['value' => 0, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $level = nq_ai_level($value);
    $pct = nq_ai_percent($value);
    $tone = ['high' => 'success', 'medium' => 'warning', 'low' => 'danger'][$level];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ai-confidence') }}" data-level="{{ $level }}" {{ $attributes->except('data-slot')->cn('flex items-center gap-2 text-caption text-muted-foreground') }}>
    <span>{{ $t['confidence'] }}</span>
    <x-nq::progress :value="$pct" size="sm" :tone="$tone" aria-label="{{ $t['confidence'] }}" class="w-16" />
    <span class="text-foreground">{{ $t[$level] }} <x-nq::numeric :value="$pct / 100" style="percent" /></span>
</div>

{{-- <x-nq::ai-states.shimmer :lines="4" />
     Text placeholder with one light sweep across all lines, for an answer that has not started yet. The sweep follows the reading direction and does not run under reduced motion (the Alpine runtime
     starts it and removes it for visitors who ask for less motion). lines: 3. label: announced to screen readers (default "Thinking"). labels: words (thinking). --}}
@include('nasaq::components.ai-states._logic')
@props(['lines' => 3, 'label' => null, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $widths = [96, 88, 92, 64, 78];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ai-shimmer') }}" role="status" aria-busy="true" x-data="nqAiShimmer" {{ $attributes->except('data-slot')->cn('relative flex flex-col gap-2.5 overflow-hidden rounded-control') }}>
    <span class="sr-only">{{ $label ?? $t['thinking'] }}</span>
    @for ($i = 0; $i < (int) $lines; $i++)
        <span aria-hidden="true" class="block h-3 rounded-[4px] bg-secondary" style="inline-size: {{ $widths[$i % count($widths)] }}%"></span>
    @endfor
    <span data-sweep aria-hidden="true" class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--nq-bg)_65%,transparent),transparent)]"></span>
</div>

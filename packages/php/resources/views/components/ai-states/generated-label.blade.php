{{-- <x-nq::ai-states.generated-label model="Claude" />
     The "AI generated" mark that goes on anything a model wrote: an accent badge with the sparkle. model: model or feature name after the label, kept left to right. labels: words (aiGenerated). --}}
@include('nasaq::components.ai-states._logic')
@props(['model' => null, 'labels' => []])
@php($t = nq_ai_words($labels))
<x-nq::badge data-slot="{{ $attributes->get('data-slot', 'ai-generated-label') }}" variant="accent" {{ $attributes->except('data-slot')->cn('gap-1') }}>
    <x-lucide-sparkles aria-hidden="true" />
    {{ $t['aiGenerated'] }}
    @if ($model)<bdi dir="ltr" class="font-normal opacity-80">{{ $model }}</bdi>@endif
</x-nq::badge>

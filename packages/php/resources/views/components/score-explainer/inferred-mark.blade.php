{{-- <x-nq::score-explainer.inferred-mark />
     The "Inferred" mark: a dashed chip, so it never depends on colour. labels: words (inferred, inferredHint). --}}
@include('nasaq::components.score-explainer._logic')
@props(['labels' => []])
@php($t = nq_score_words($labels))
<span data-slot="{{ $attributes->get('data-slot', 'score-inferred') }}" title="{{ $t['inferredHint'] }}"
    {{ $attributes->except('data-slot')->cn('inline-flex h-5 items-center gap-1 rounded-[4px] border border-dashed border-nq-line-strong px-1.5 text-caption text-muted-foreground [&_svg]:size-3') }}>
    <x-lucide-sparkles aria-hidden="true" />
    {{ $t['inferred'] }}
</span>

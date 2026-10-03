{{-- <x-nq::score-explainer.source-chip :source="['label' => 'LinkedIn', 'url' => 'https://example.com']" />
     A source of evidence. A link when it has a URL, plain text otherwise. With clickable it is a button that dispatches "score-source" { label, kind } (needs the Alpine runtime).
     source: { label, url?, kind?, inferred? }. labels: words (opensNewTab, inferredHint). --}}
@include('nasaq::components.score-explainer._logic')
@props(['source', 'clickable' => false, 'labels' => []])
@php
    $t = nq_score_words($labels);
    $inferred = ! empty($source['inferred']);
    $chip = 'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-caption outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
    $tone = $inferred ? 'border-dashed border-nq-line-strong text-muted-foreground' : 'border-border bg-secondary text-foreground';
    $url = $source['url'] ?? null;
    $safe = $url && preg_match('#^https?://#i', $url);
    $title = $inferred ? $t['inferredHint'] : null;
@endphp
@if ($safe)
    <a data-slot="{{ $attributes->get('data-slot', 'score-source') }}" href="{{ $url }}" target="_blank" rel="noopener noreferrer" @if ($title) title="{{ $title }}" @endif
        {{ $attributes->except('data-slot')->cn([$chip, $tone, 'hover:bg-nq-hover']) }}>
        @if (! empty($source['kind']))<span class="text-muted-foreground">{{ $source['kind'] }}</span>@endif
        <span dir="auto" class="truncate">{{ $source['label'] }}</span>
        @if ($inferred)<x-lucide-sparkles aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />@endif
        <x-lucide-external-link aria-hidden="true" class="size-3 shrink-0 text-muted-foreground rtl:-scale-x-100" />
        <span class="sr-only">{{ $t['opensNewTab'] }}</span>
    </a>
@elseif ($clickable)
    <button data-slot="{{ $attributes->get('data-slot', 'score-source') }}" type="button" @if ($title) title="{{ $title }}" @endif
        x-on:click="$dispatch('score-source', @js(['label' => $source['label'], 'kind' => $source['kind'] ?? null]))"
        {{ $attributes->except('data-slot')->cn([$chip, $tone, 'cursor-pointer hover:bg-nq-hover']) }}>
        @if (! empty($source['kind']))<span class="text-muted-foreground">{{ $source['kind'] }}</span>@endif
        <span dir="auto" class="truncate">{{ $source['label'] }}</span>
        @if ($inferred)<x-lucide-sparkles aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />@endif
    </button>
@else
    <span data-slot="{{ $attributes->get('data-slot', 'score-source') }}" @if ($title) title="{{ $title }}" @endif {{ $attributes->except('data-slot')->cn([$chip, $tone]) }}>
        @if (! empty($source['kind']))<span class="text-muted-foreground">{{ $source['kind'] }}</span>@endif
        <span dir="auto" class="truncate">{{ $source['label'] }}</span>
        @if ($inferred)<x-lucide-sparkles aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />@endif
    </span>
@endif

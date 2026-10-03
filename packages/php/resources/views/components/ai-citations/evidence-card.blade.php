{{-- <x-nq::ai-citations.evidence-card :source="$source" :index="1" />
     A source with the passage the answer used. The quote is plain text with matches marked, never HTML.
     source: { id, title, url?, quote?, snippet?, locator?, kind?, score? (0..1), highlight? (string or list) }. index: 1-based number in the corner, matching the [n] in the text.
     active: highlight the card. track: highlight it while its source is the active one in the enclosing <x-nq::ai-citations> (needs the Alpine runtime).
     compact: hide the relevance bar and the open link (used inside a popover). labels: words. --}}
@include('nasaq::components.ai-citations._logic')
@include('nasaq::components.copilot-chat._logic')
@props(['source', 'index' => null, 'active' => false, 'track' => false, 'compact' => false, 'labels' => []])
@php
    $t = nq_aic_words($labels);
    $quote = $source['quote'] ?? ($source['snippet'] ?? null);
    $parts = nq_aic_split_highlight((string) $quote, $source['highlight'] ?? null);
    $safe = nq_cc_safe_url($source['url'] ?? null);
    $host = nq_cc_host($source['url'] ?? null);
    $score = isset($source['score']) ? min(1, max(0, $source['score'])) : null;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ai-evidence-card') }}"
    @if ($track) x-bind:data-active="$data.active === {{ \Illuminate\Support\Js::from($source['id']) }} ? `` : null" x-on:mouseenter="$dispatch(`nq-cite-active`, { id: {{ \Illuminate\Support\Js::from($source['id']) }} })" x-on:mouseleave="$dispatch(`nq-cite-active`, { id: null })" @elseif ($active) data-active @endif
    {{ $attributes->except('data-slot')->cn(['flex min-w-0 flex-col gap-2 rounded-control border border-border bg-card p-3 text-start transition-colors duration-150 ease-nq data-active:border-nq-accent data-active:bg-nq-hover']) }}>
    <div class="flex items-start gap-2">
        @if ($index !== null)
            <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] tabular-nums text-foreground"><x-nq::numeric :value="$index" /></span>
        @else
            <x-lucide-file-text aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        @endif
        <div class="flex min-w-0 flex-1 flex-col">
            <span dir="auto" class="text-body-sm font-medium text-foreground">{{ $source['title'] }}</span>
            <span class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                @if ($host !== '')<bdi dir="ltr">{{ $host }}</bdi>@endif
                @if (! empty($source['locator']))<bdi dir="ltr">{{ $source['locator'] }}</bdi>@endif
            </span>
        </div>
        @if (! empty($source['kind']))<x-nq::badge variant="outline">{{ $source['kind'] }}</x-nq::badge>@endif
    </div>
    <figure class="flex flex-col gap-1">
        <figcaption class="sr-only">{{ $t['excerpt'] }}</figcaption>
        @if ($quote)
            <blockquote dir="auto" class="flex gap-2 border-s-2 border-nq-line-strong ps-3 text-body-sm text-nq-fg-body">
                <x-lucide-quote aria-hidden="true" class="mt-0.5 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                <span>@foreach ($parts as $p)@if ($p['hit'])<mark class="rounded-[2px] bg-nq-accent/20 px-0.5 text-foreground">{{ $p['text'] }}</mark>@else<span>{{ $p['text'] }}</span>@endif @endforeach</span>
            </blockquote>
        @else
            <p class="text-caption text-muted-foreground">{{ $t['noExcerpt'] }}</p>
        @endif
    </figure>
    @if (! $compact && ($score !== null || $safe))
        <div class="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
            @if ($score !== null)
                <span class="flex items-center gap-2">
                    {{ $t['relevance'] }}
                    <x-nq::progress :value="round($score * 100)" size="sm" aria-label="{{ $t['relevance'] }}" class="w-14" />
                    <span class="text-foreground"><x-nq::numeric :value="$score" style="percent" /></span>
                </span>
            @else
                <span></span>
            @endif
            @if ($safe)
                <a href="{{ $source['url'] }}" target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    {{ $t['openSource'] }}
                    <x-lucide-external-link aria-hidden="true" class="size-3 rtl:-scale-x-100" />
                </a>
            @endif
        </div>
    @endif
</div>

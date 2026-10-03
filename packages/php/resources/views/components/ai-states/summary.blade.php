{{-- <x-nq::ai-states.summary tldr="Two tasks are overdue." :points="['Send the invoice']" full="## Details ..." :confidence="0.8" model="Claude" regenerate feedback />
     A finished AI summary: TL;DR first, key points, the long version behind a toggle, the sources it came from, how confident the model is, and the controls people expect (copy, thumbs, regenerate).
     Always labelled "AI generated" and says to check important details.
     tldr: one or two sentences. points: key points. full: the long version, as Markdown (shown when expanded; default-expanded starts open). sources: [{ id, title, url?, snippet? }]. confidence: 0 to 1, shows the meter.
     model: shown next to the AI generated label. title: heading (default "Summary"). loading: no result yet, shows the shimmer. streaming: still being written (caret, no points, no controls).
     feedback: the thumbs exist with this flag (React: onFeedback); rating: up | down is the pressed thumb. regenerate: the Regenerate button exists (React: onRegenerate). labels: words (see nq_ai_words).
     Events, bubbling from the root: nq-ai-feedback { value }, nq-ai-regenerate, nq:copy { text } (the copy button). The copy button copies the TL;DR and the points, and the long version while it is open.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.ai-states._logic')
@props(['tldr' => '', 'points' => [], 'full' => null, 'sources' => [], 'confidence' => null, 'model' => null, 'title' => null, 'loading' => false, 'streaming' => false, 'defaultExpanded' => false,
    'feedback' => false, 'rating' => null, 'regenerate' => false, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $busy = $loading || $streaming;
    $headingId = 'nq-ai-summary-'.\Illuminate\Support\Str::random(6);
    $config = \Illuminate\Support\Js::from([
        'tldr' => $tldr, 'points' => array_values($points), 'full' => (string) $full, 'expanded' => (bool) $defaultExpanded, 'show' => $t['showFull'], 'hide' => $t['hideFull'],
    ])->toHtml();
@endphp
<x-nq::card role="region" data-slot="{{ $attributes->get('data-slot', 'ai-summary') }}" aria-labelledby="{{ $headingId }}" :aria-busy="$busy ? 'true' : null" x-data="nqAiSummary({!! $config !!})"
    {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <x-nq::card.header class="grid-cols-[1fr_auto]">
        <x-nq::card.title as="h3" class="flex items-center gap-2">
            <x-lucide-sparkles aria-hidden="true" class="size-4 text-nq-accent-text" />
            <span id="{{ $headingId }}">{{ $title ?? $t['summary'] }}</span>
        </x-nq::card.title>
        <x-nq::ai-states.generated-label :model="$model" :labels="$labels" />
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-4">
        @if ($loading)
            <x-nq::ai-states.shimmer :lines="4" :label="$t['loading']" />
        @else
            <div class="flex flex-col gap-1">
                <span class="text-eyebrow text-muted-foreground">{{ $t['tldr'] }}</span>
                <x-nq::ai-states.streaming-text :text="$tldr" :streaming="$streaming" :markdown="false" :labels="$labels" class="[&_p]:text-body [&_p]:text-foreground" />
            </div>
            @if (count($points) > 0 && ! $streaming)
                <div class="flex flex-col gap-1.5">
                    <span class="text-eyebrow text-muted-foreground">{{ $t['keyPoints'] }}</span>
                    <ul class="flex flex-col gap-1.5">
                        @foreach ($points as $p)
                            <li class="flex items-start gap-2 text-body-sm text-nq-fg-body">
                                <span aria-hidden="true" class="mt-2 size-1 shrink-0 rounded-full bg-nq-accent"></span>
                                <span dir="auto" class="min-w-0 text-start">{{ $p }}</span>
                            </li>
                        @endforeach
                    </ul>
                </div>
            @endif
            @if ($full && ! $streaming)
                <x-nq::collapsible :open="$defaultExpanded" x-model="expanded">
                    <x-nq::collapsible.trigger variant="link" class="min-h-control-sm gap-1.5 rounded-control text-label no-underline">
                        <span x-text="expanded ? hide : show">{{ $defaultExpanded ? $t['hideFull'] : $t['showFull'] }}</span>
                        <x-lucide-chevron-down aria-hidden="true" class="size-4 transition-transform duration-150 ease-nq motion-reduce:transition-none [[data-panel-open]_&]:rotate-180" />
                    </x-nq::collapsible.trigger>
                    <x-nq::collapsible.panel>
                        <div class="border-t border-border pt-3"><x-nq::markdown :source="$full" /></div>
                    </x-nq::collapsible.panel>
                </x-nq::collapsible>
            @endif
            @if (count($sources) > 0 && ! $streaming)
                <x-nq::copilot-chat.sources :sources="$sources" :t="['sources' => $t['sources']]" />
            @endif
        @endif
    </x-nq::card.content>
    @unless ($loading)
        <x-nq::card.footer class="flex-col items-stretch gap-3 border-t border-border pt-3">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                @if ($confidence !== null)<x-nq::ai-states.confidence-meter :value="$confidence" :labels="$labels" />@endif
                <span class="ms-auto inline-flex items-center gap-0.5">
                    <x-nq::copy-button value="" value-expr="text()" :label="$t['copy']" :disabled="$streaming" />
                    @if ($regenerate)
                        <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['regenerate'] }}" :disabled="$streaming" x-on:click="$dispatch(`nq-ai-regenerate`)"><x-lucide-refresh-cw aria-hidden="true" /></x-nq::button>
                    @endif
                    @if ($feedback)<x-nq::ai-states.feedback :value="$rating" :labels="$labels" />@endif
                </span>
            </div>
            <p class="text-caption text-muted-foreground">{{ $t['disclaimer'] }}</p>
        </x-nq::card.footer>
    @endunless
</x-nq::card>

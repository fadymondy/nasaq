{{-- <x-nq::ask-ai.insight-card title="Signups fell 18% on mobile" tone="warning" :metric="['label' => 'Mobile signups', 'value' => 1240, 'delta' => -0.18]" body="The drop starts on the day the new form shipped." :confidence="0.78" :actions="[['id' => 'open', 'label' => 'Open the funnel']]" ask dismissible />
     An insight the AI found, placed where it applies: a labelled card with the finding, a metric, the reasoning, the sources it used, how sure it is, and what to do next. Always marked as AI output. It holds no model logic.
     title: the finding in one line. body: Markdown with the detail. tone: neutral (default, the AI accent) | info | success | warning | danger colours the edge and the small label.
     metric: ['label', 'value' (number or text), 'delta' (a fraction: 0.124 is +12.4%), 'invert' (down is good), 'style' (decimal | percent | currency), 'currency', 'compact', 'maxFraction'].
     confidence: 0 to 1. sources: [['id', 'title', 'url'?, ...]] (ai-citations source chips). model: model name, kept left to right. actions: [['id', 'label', 'variant' => 'secondary' | 'primary' | 'ghost']].
     ask: adds an "Ask AI about this" button. dismissible: adds a dismiss button that hides the card. feedback: up | down | null, shows the thumbs (also x-model on the pill is not needed: the thumbs fire nq-ai-feedback).
     loading: a shimmer while the insight is worked out. streaming: the body is still arriving (plain text, with a caret). variant: card (default) | inline (no card chrome: a tinted strip). labels: words (insight, dismiss, askMore, sources, loading, tone, good, bad).
     Events, bubbling from the card (needs the Alpine runtime, @nasaqScripts):
       nq-insight-action { id }     nq-insight-ask     nq-insight-dismiss     nq-ai-feedback { value }
     Differences from the React component: the metric label and the title are text, not nodes. --}}
@include('nasaq::components.ai-states._logic')
@include('nasaq::components.ask-ai._logic')
@props(['title', 'body' => null, 'tone' => 'neutral', 'metric' => null, 'confidence' => null, 'sources' => [], 'model' => null, 'actions' => [], 'ask' => false, 'dismissible' => false, 'feedback' => null, 'showFeedback' => null, 'loading' => false, 'streaming' => false, 'variant' => 'card', 'labels' => []])
@php
    $t = nq_askai_words($labels);
    $border = ['neutral' => 'border-s-nq-accent', 'info' => 'border-s-nq-info', 'success' => 'border-s-nq-success', 'warning' => 'border-s-nq-warning', 'danger' => 'border-s-nq-danger'];
    $text = ['neutral' => 'text-nq-accent-text', 'info' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text'];
    $tone = isset($border[$tone]) ? $tone : 'neutral';
    $inline = $variant === 'inline';
    $hasDelta = $metric !== null && isset($metric['delta']) && $metric['delta'] !== null;
    $dTone = 'neutral';
    if ($hasDelta && is_finite((float) $metric['delta']) && (float) $metric['delta'] != 0.0) {
        $dTone = ((float) $metric['delta'] > 0) !== (bool) ($metric['invert'] ?? false) ? 'positive' : 'negative';
    }
    $withFeedback = $showFeedback ?? ($feedback !== null);
    $hasActions = count($actions) > 0 || $ask || $withFeedback;
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'ai-insight-card') }}" data-variant="{{ $variant }}" data-tone="{{ $tone }}" @if ($loading || $streaming) aria-busy="true" @endif
    @if ($dismissible) x-data="{ gone: false }" x-show="! gone" @endif
    {{ $attributes->except('data-slot')->cn($inline ? ['flex min-w-0 flex-col gap-2 rounded-control border-s-4 bg-secondary p-3', $border[$tone]] : ['flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground', 'min-w-0 border-s-4', $border[$tone]]) }}>
    <div @if (! $inline) data-slot="card-content" @endif class="{{ $inline ? 'contents' : 'flex flex-col gap-3 px-4' }}">
        <div class="flex items-start gap-2">
            <x-lucide-sparkles aria-hidden="true" class="mt-0.5 size-4 shrink-0 {{ $text[$tone] }}" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="text-caption font-medium {{ $text[$tone] }}">{{ $t['insight'] }}<span aria-hidden="true"> · </span>{{ $t['tone'][$tone] }}</span>
                <div dir="auto" class="text-body-sm font-semibold text-foreground">{{ $title }}</div>
            </div>
            @if ($model)<bdi dir="ltr" class="hidden shrink-0 text-caption text-muted-foreground sm:inline">{{ $model }}</bdi>@endif
            @if ($dismissible)
                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['dismiss'] }}" class="-my-1 -me-1" x-on:click="gone = true; $dispatch('nq-insight-dismiss')"><x-lucide-x aria-hidden="true" /></x-nq::button>
            @endif
        </div>
        @if ($loading)
            <x-nq::ai-states.shimmer :lines="2" :label="$t['loading']" />
        @else
            @if ($metric)
                <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span class="text-caption text-muted-foreground">{{ $metric['label'] ?? '' }}</span>
                    <span class="text-h3 tabular-nums text-foreground">
                        @if (is_numeric($metric['value'] ?? null))
                            <x-nq::numeric :value="$metric['value']" :style="$metric['style'] ?? 'decimal'" :currency="$metric['currency'] ?? null" :compact="(bool) ($metric['compact'] ?? false)" :max-fraction="$metric['maxFraction'] ?? null" />
                        @else
                            {{ $metric['value'] ?? '' }}
                        @endif
                    </span>
                    @if ($hasDelta)
                        <span class="{{ \Nasaq\Cn::merge('text-caption tabular-nums', $dTone === 'positive' ? 'text-nq-success-text' : '', $dTone === 'negative' ? 'text-nq-danger-text' : '', $dTone === 'neutral' ? 'text-muted-foreground' : '') }}">
                            @if ((float) $metric['delta'] > 0)<bdi dir="ltr">+</bdi>@endif<x-nq::numeric :value="$metric['delta']" style="percent" :max-fraction="1" />
                        </span>
                    @endif
                </div>
            @endif
            @if (filled($body))
                @if ($streaming)
                    <x-nq::ai-states.streaming-text :text="$body" streaming :markdown="false" />
                @else
                    <x-nq::markdown :source="$body" class="text-body-sm" />
                @endif
            @endif
            @if ($confidence !== null)<x-nq::ai-states.confidence-meter :value="$confidence" />@endif
            @if (count($sources) > 0)<x-nq::ai-citations.source-chips :sources="$sources" :label="$t['sources']" />@endif
        @endif
        @if (! $loading && $hasActions)
            <div class="flex flex-wrap items-center gap-2">
                @foreach ($actions as $a)
                    <x-nq::button type="button" size="sm" :variant="$a['variant'] ?? 'secondary'" data-id="{{ $a['id'] }}" x-on:click="$dispatch('nq-insight-action', { id: $el.dataset.id })">{{ $a['label'] }}</x-nq::button>
                @endforeach
                @if ($ask)
                    <x-nq::button type="button" size="sm" variant="ghost" x-on:click="$dispatch('nq-insight-ask')"><x-lucide-sparkles aria-hidden="true" class="text-nq-accent-text" />{{ $t['askMore'] }}</x-nq::button>
                @endif
                <span class="flex-1"></span>
                @if ($withFeedback)<x-nq::ai-states.feedback :value="$feedback" :labels="['good' => $t['good'], 'bad' => $t['bad']]" />@endif
            </div>
        @endif
    </div>
</section>

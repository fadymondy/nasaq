{{-- <x-nq::ai-states.streaming-text :text="$answer" :streaming="$busy" />   <x-nq::ai-states.streaming-text :markdown="false" text-expr="answer" streaming-expr="busy" />
     Streaming answer text: a caret at the end and Markdown that stays valid while it is half written (open code fences and bold are closed for display, dangling links lose their syntax).
     Screen readers are told once the answer is ready, not on every token.
     text: the text so far. streaming: more text is still coming (caret). markdown: render as Markdown on the server (default true), false keeps the text plain. caret: draw the caret while streaming (true).
     Server driven (Livewire, a fresh response): pass the text again as it grows; the server render shows it at once.
     Live in the browser: text-expr and streaming-expr are Alpine expressions ("answer", "busy") re-read whenever they change. The text is then plain (there is no Markdown parser in the browser), and growth
     is revealed smoothly (reveal, default true; cps: characters a second, 90, speeding up when the stream runs ahead). Under reduced motion the text appears at once and the caret does not pulse.
     Fires nq-ai-revealed once the whole text is on screen and streaming has stopped. labels: words (ready). Needs the Alpine runtime for the live mode (@nasaqScripts). --}}
@include('nasaq::components.ai-states._logic')
@props(['text' => '', 'streaming' => false, 'reveal' => true, 'cps' => 90, 'markdown' => true, 'caret' => true, 'textExpr' => null, 'streamingExpr' => null, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $live = $textExpr !== null;
    $md = $markdown && ! $live;
    $text = (string) $text;
    $finished = ! $streaming;
    $showCaret = $caret && ! $finished;
    $config = \Illuminate\Support\Js::from([
        'text' => $text, 'streaming' => (bool) $streaming, 'reveal' => (bool) $reveal, 'cps' => (int) $cps, 'caret' => (bool) $caret, 'ready' => $t['ready'], 'caretClass' => nq_ai_caret(false),
    ])->toHtml();
    $plain = 'whitespace-pre-wrap text-start text-body text-nq-fg-body';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ai-streaming-text') }}"{!! $live ? ' x-data="nqAiStreamingText('.$config.')" x-effect="sync('.e($textExpr).', '.e($streamingExpr ?? 'false').')" x-bind:aria-busy="! finished" x-bind:data-streaming="finished ? null : \'\'"' : ($finished ? ' aria-busy="false"' : ' aria-busy="true" data-streaming') !!}
    {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <div aria-live="off" class="{{ $md && $showCaret ? nq_ai_caret(true) : '' }}">
        @if ($md)
            <x-nq::markdown :source="$finished ? $text : nq_ai_partial_markdown($text)" />
        @elseif ($live)
            <p dir="auto" data-slot="ai-plain" x-text="visible" x-bind:class="showCaret ? caretClass : ``" class="{{ $plain }}">{{ $text }}</p>
        @else
            <p dir="auto" data-slot="ai-plain" class="{{ \Nasaq\Cn::merge($plain, $showCaret ? nq_ai_caret(false) : '') }}">{{ $text }}</p>
        @endif
    </div>
    @if ($live)
        <span role="status" class="sr-only" x-text="status">{{ $finished && $text !== '' ? $t['ready'] : '' }}</span>
    @else
        <span role="status" class="sr-only">{{ $finished && $text !== '' ? $t['ready'] : '' }}</span>
    @endif
</div>

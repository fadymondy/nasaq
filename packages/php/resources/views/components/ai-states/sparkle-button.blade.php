{{-- <x-nq::ai-states.sparkle-button>Summarize</x-nq::ai-states.sparkle-button>   <x-nq::ai-states.sparkle-button :generating="true" show-shortcut />
     The one entry point to an AI feature: a Nasaq button with the sparkle (takes the button props: variant, size, href, disabled ...). The label is the slot, "Ask AI" / "اسأل الذكاء الاصطناعي" by default.
     generating: the button shows the spinner and says "Generating". show-shortcut: draws the Cmd/Ctrl+J hint after the label (needs the Alpine runtime to show the Command glyph on Apple).
     labels: partial overrides of the words (keys of nq_ai_words: ask, generating). --}}
@include('nasaq::components.ai-states._logic')
@props(['generating' => false, 'showShortcut' => false, 'labels' => []])
@php
    $t = nq_ai_words($labels);
    $text = trim((string) $slot) !== '' ? $slot : ($generating ? $t['generating'] : $t['ask']);
@endphp
<x-nq::button data-slot="{{ $attributes->get('data-slot', 'ai-sparkle-button') }}" :loading="(bool) $generating" {{ $attributes->except('data-slot') }}>
    @unless ($generating)<x-lucide-sparkles aria-hidden="true" class="text-nq-accent-text" />@endunless
    {{ $text }}
    @if ($showShortcut && ! $generating)
        <span aria-hidden="true" x-data="nqAiKeys" class="ms-1 hidden gap-0.5 sm:inline-flex">
            @foreach (nq_ai_keys('Mod J') as $k)<x-nq::text.kbd :data-key="$k['key']">{{ $k['text'] }}</x-nq::text.kbd>@endforeach
        </span>
    @endif
</x-nq::button>

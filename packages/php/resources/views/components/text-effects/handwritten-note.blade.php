{{-- <x-nq::text-effects.handwritten-note author="Fady">Remember to say thanks.</x-nq::text-effects.handwritten-note>
     A margin note that looks written by hand: a slightly tilted paper with a handwriting font, for a tip or a human aside on a marketing page or a document. The font is a system stack
     (or --nq-font-handwriting); the note is plain text for assistive tech. Static markup, no Alpine.
     tone: note (default) | info | success | brand | neutral. rotate: tilt in degrees, kept between -6 and 6 (-2). tape: a strip of tape at the top (true). author: who wrote it, in plain type under
     the note. Slot: author (<x-slot:author>, richer content for the author line). --}}
@props(['tone' => 'note', 'rotate' => -2, 'tape' => true, 'author' => null])
@php
    $tones = [
        'note' => 'bg-nq-warning-soft border-nq-warning/40',
        'info' => 'bg-nq-info-soft border-nq-info/40',
        'success' => 'bg-nq-success-soft border-nq-success/40',
        'brand' => 'bg-[color-mix(in_oklab,var(--nq-brand)_14%,var(--nq-surface))] border-nq-brand/40',
        'neutral' => 'bg-nq-surface-soft border-nq-line-strong',
    ];
    $font = 'var(--nq-font-handwriting, "Bradley Hand", "Segoe Print", "Segoe Script", "Comic Sans MS", "Noto Naskh Arabic", cursive)';
    $deg = max(-6, min(6, (float) $rotate));
    $hasAuthor = $author instanceof \Illuminate\View\ComponentSlot ? ! $author->isEmpty() : filled($author);
@endphp
<aside data-slot="{{ $attributes->get('data-slot', 'handwritten-note') }}" style="transform: rotate({{ $deg }}deg); {{ $attributes->get('style') }}"
    {{ $attributes->except(['data-slot', 'style'])->cn(['relative inline-block max-w-xs rounded-[3px] border px-4 pb-3 pt-5 text-foreground shadow-floating', $tones[$tone] ?? $tones['note']]) }}>
    @if ($tape)
        <span aria-hidden="true" class="absolute inset-x-0 -top-2.5 mx-auto h-5 w-16 rotate-2 bg-[color-mix(in_oklab,var(--nq-fg)_14%,transparent)]"></span>
    @endif
    <div class="text-h3 leading-snug" style="font-family: {{ $font }}">{{ $slot }}</div>
    @if ($hasAuthor)
        <div class="mt-2 text-caption text-muted-foreground">{{ $author }}</div>
    @endif
</aside>

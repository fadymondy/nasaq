{{-- <x-nq::blog-post.callout kind="warning" title="Heads up">Back up first.</x-nq::blog-post.callout>
     A highlighted aside inside an article. kind: note | tip | important | warning | caution. title: default the kind's name ("Warning" / "تنبيه").
     In Markdown write `> [!WARNING]` on the first line of a blockquote; <x-nq::blog-post.post-body> turns it into this. --}}
@props(['kind' => 'note', 'title' => null])
@include('nasaq::components.blog-post._logic')
@php
    $kind = in_array($kind, ['note', 'tip', 'important', 'warning', 'caution'], true) ? $kind : 'note';
    $words = nq_bp_words();
    $style = [
        'note' => ['info', 'border-nq-info/40 bg-nq-info-soft', 'text-nq-info-text'],
        'tip' => ['lightbulb', 'border-nq-success/40 bg-nq-success-soft', 'text-nq-success-text'],
        'important' => ['star', 'border-nq-accent/40 bg-nq-accent/10', 'text-nq-accent-text'],
        'warning' => ['triangle-alert', 'border-nq-warning/40 bg-nq-warning-soft', 'text-nq-warning-text'],
        'caution' => ['octagon-alert', 'border-nq-danger/40 bg-nq-danger-soft', 'text-nq-danger-text'],
    ][$kind];
@endphp
<aside data-slot="{{ $attributes->get('data-slot', 'callout') }}" data-kind="{{ $kind }}" {{ $attributes->except('data-slot')->cn('flex gap-3 rounded-card border p-4 text-start', $style[1]) }}>
    <x-dynamic-component :component="'lucide-'.$style[0]" class="mt-0.5 size-4 shrink-0 {{ $style[2] }}" aria-hidden="true" />
    <div class="flex min-w-0 flex-col gap-1">
        <p class="text-label text-foreground">{{ $title ?? $words[$kind] }}</p>
        <div dir="auto" class="flex flex-col gap-2 text-body-sm text-nq-fg-body [&_p]:m-0">{{ $slot }}</div>
    </div>
</aside>

{{-- <x-nq::issue-view.type-icon type="bug" />
     The glyph of an issue type: bug, feature, improvement, task, chore. --}}
@props(['type' => 'task'])
@php
    $icon = ['bug' => 'bug', 'feature' => 'sparkles', 'improvement' => 'trending-up', 'task' => 'square-check', 'chore' => 'wrench'][$type] ?? 'square-check';
@endphp
@svg('lucide-'.$icon, (string) $attributes->cn('size-4 shrink-0 text-muted-foreground')->get('class'), ['aria-hidden' => 'true'])

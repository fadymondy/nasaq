{{-- <x-nq::issue-view.priority-icon priority="high" />
     A flag in the priority colour (urgent high medium low none). The name is always shown next to it. --}}
@props(['priority' => 'none'])
@php
    $color = ['urgent' => 'var(--nq-danger)', 'high' => 'var(--nq-tag-orange)', 'medium' => 'var(--nq-tag-amber)', 'low' => 'var(--nq-tag-blue)', 'none' => 'var(--nq-fg-muted)'][$priority] ?? 'var(--nq-fg-muted)';
@endphp
@svg('lucide-flag', (string) $attributes->cn('size-4 shrink-0')->get('class'), ['aria-hidden' => 'true', 'style' => 'color: '.$color])

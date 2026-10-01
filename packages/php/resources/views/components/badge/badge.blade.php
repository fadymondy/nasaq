{{-- <x-nq::badge variant="success">Active</x-nq::badge>   <x-nq::badge variant="tag" hue="blue">Design</x-nq::badge>
     variant: neutral | outline | brand | accent | success | warning | danger | info | tag
     hue (variant="tag"): gray red orange amber green teal blue violet pink --}}
@props(['variant' => 'neutral', 'hue' => 'gray'])
@php
    $variants = [
        'neutral' => 'border-border bg-secondary text-foreground',
        'outline' => 'border-border text-muted-foreground',
        'brand' => 'border-nq-brand/40 bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-foreground',
        'accent' => 'border-nq-accent/40 bg-nq-accent/15 text-nq-accent-text',
        'success' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        'warning' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text',
        'danger' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        'info' => 'border-nq-info/40 bg-nq-info-soft text-nq-info-text',
        'tag' => 'border-transparent bg-[var(--tag-soft)] text-[var(--tag-solid)]',
    ];
    $style = collect([
        $variant === 'tag' ? '--tag-solid: var(--nq-tag-'.$hue.'); --tag-soft: var(--nq-tag-'.$hue.'-soft)' : null,
        $attributes->get('style'),
    ])->filter()->implode('; ');
@endphp
<span data-slot="badge" @if ($style) style="{{ $style }}" @endif
    {{ $attributes->except('style')->cn([
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3',
        $variants[$variant] ?? $variants['neutral'],
    ]) }}>{{ $slot }}</span>

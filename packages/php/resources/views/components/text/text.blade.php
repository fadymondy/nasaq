{{-- <x-nq::text variant="h1">Title</x-nq::text>   <x-nq::text variant="h2" as="div">Not a heading</x-nq::text>
     variant: display | h1 | h2 | h3 | body | body-sm | label | caption | eyebrow | code. as: the element (default per variant). --}}
@props(['variant' => 'body', 'as' => null])
@php
    $roles = [
        'display' => 'text-display text-foreground',
        'h1' => 'text-h1 text-foreground',
        'h2' => 'text-h2 text-foreground',
        'h3' => 'text-h3 text-foreground',
        'body' => 'text-body text-nq-fg-body',
        'body-sm' => 'text-body-sm text-nq-fg-body',
        'label' => 'text-label text-foreground',
        'caption' => 'text-caption text-muted-foreground',
        'eyebrow' => 'eyebrow',
        'code' => 'font-mono text-code',
    ];
    $elements = [
        'display' => 'h1', 'h1' => 'h1', 'h2' => 'h2', 'h3' => 'h3', 'body' => 'p', 'body-sm' => 'p',
        'label' => 'span', 'caption' => 'span', 'eyebrow' => 'span', 'code' => 'code',
    ];
    $tag = $as ?? ($elements[$variant] ?? 'p');
@endphp
<{{ $tag }} data-slot="{{ $attributes->get('data-slot', 'text') }}" {{ $attributes->except('data-slot')->cn($roles[$variant] ?? $roles['body']) }}>{{ $slot }}</{{ $tag }}>

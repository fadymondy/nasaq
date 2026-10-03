{{-- Internal part of <x-nq::docs-shell>: the previous / next link under a page. With nav-href it is a link; without it a button that fires nq-navigate. --}}
@props(['node', 'label', 'direction' => 'prev', 'href' => null])
@php
    $prev = $direction === 'prev';
    $classes = 'flex min-w-0 flex-col gap-1 rounded-card border border-border p-4 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus '.($prev ? '' : 'sm:col-start-2 sm:text-end');
@endphp
@if ($href)
    <a href="{{ $href }}" x-on:click="visit({{ \Illuminate\Support\Js::from((string) $node['id'])->toHtml() }}, $event)" {{ $attributes->cn($classes) }}>
@else
    <button type="button" x-on:click="visit({{ \Illuminate\Support\Js::from((string) $node['id'])->toHtml() }})" {{ $attributes->cn($classes) }}>
@endif
    <span class="flex items-center gap-1 text-caption text-muted-foreground {{ $prev ? '' : 'sm:justify-end' }}">
        @if ($prev)<x-nq::icon name="chevron-left" directional class="size-3.5" />@endif
        {{ $label }}
        @unless ($prev)<x-nq::icon name="chevron-right" directional class="size-3.5" />@endunless
    </span>
    <span dir="auto" class="truncate font-medium">{{ $node['title'] }}</span>
@if ($href)
    </a>
@else
    </button>
@endif

{{-- <x-nq::command-palette.search-trigger />   <x-nq::command-palette.search-trigger variant="icon" />
     The "Search... Cmd+K" field that opens the <x-nq::command-palette> (it fires "nq-command-palette-open" on window). variant: field (default, the sidebar's box) | icon (a header button).
     label: the text (default Search… / بحث…). The keys show Command on Apple platforms and Ctrl elsewhere. Not ported: folding to the icon on the collapsed rail (use variant="icon" there).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['variant' => 'field', 'label' => null])
@php
    $label ??= \Nasaq\Nasaq::t('Search…', 'بحث…');
    $icon = $variant === 'icon';
@endphp
<button type="button" data-slot="search-trigger" aria-keyshortcuts="Meta+K Control+K" x-data="nqSearchTrigger" x-on:click="press($event)"
    @if ($icon) aria-label="{{ $label }}" title="{{ $label }}" @endif
    {{ $attributes->cn([
        'flex h-control min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control border border-border bg-card px-2 text-body-sm text-muted-foreground',
        'transition-colors duration-150 ease-nq outline-none hover:border-nq-line-strong hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0',
        'size-control justify-center border-transparent bg-transparent px-0 hover:bg-nq-hover' => $icon,
    ]) }}>
    <x-lucide-search aria-hidden="true" />
    @unless ($icon)
        <span class="flex-1 truncate text-start">{{ $label }}</span>
        <span class="flex gap-0.5" dir="ltr">
            <x-nq::text.kbd x-text="mod">Ctrl</x-nq::text.kbd>
            <x-nq::text.kbd>K</x-nq::text.kbd>
        </span>
    @endunless
</button>

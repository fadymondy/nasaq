{{-- Internal part of <x-nq::docs-shell>: the filter box and the navigation tree. It is rendered twice (the desktop column and the phone drawer);
     the filter state (`term`) and the tree filtering live in the shell's nqDocsShell scope. The default slot is the header above the tree. --}}
@props(['nav' => [], 'activeId' => '', 'searchable' => true, 'words' => []])
@include('nasaq::components.docs-shell._logic')
@php
    $expanded = array_map(fn ($n) => (string) $n['id'], array_slice(nq_docs_trail($nav, (string) $activeId), 0, -1));
@endphp
<nav aria-label="{{ $words['nav'] }}" x-effect="filterTree($el, term)" class="flex flex-col gap-3">
    {{ $slot }}
    @if ($searchable)
        <x-nq::input-group class="h-control-sm">
            <x-nq::input-group.addon><x-lucide-search aria-hidden="true" /></x-nq::input-group.addon>
            <x-nq::input-group.input type="search" x-model="term" placeholder="{{ $words['filter'] }}" aria-label="{{ $words['filter'] }}" />
            <x-nq::input-group.addon align="end" x-show="term !== ''" style="display: none">
                <button type="button" aria-label="{{ $words['clearFilter'] }}" x-on:click="term = ''"
                    class="rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"><x-lucide-x aria-hidden="true" /></button>
            </x-nq::input-group.addon>
        </x-nq::input-group>
    @endif
    <x-nq::tree-view :aria-label="$words['nav']" :items="nq_docs_items($nav)" :default-expanded="$expanded" :default-selected="[(string) $activeId]" x-model="picked" />
    <p x-show="noMatch()" x-text="noMatchText()" style="display: none" class="px-2 text-body-sm text-muted-foreground"></p>
</nav>

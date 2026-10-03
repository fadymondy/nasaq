{{-- <x-nq::ai-citations.marker :n="1" :source="$source" />
     The small numbered button that stands for a [n] in the text. Hover (after 150 ms) or press it to see the passage behind it in a popover.
     It tells the enclosing <x-nq::ai-citations> which source is active with a bubbling "nq-cite-active" { id | null } and lights up when that source is active.
     Needs the Alpine runtime (@nasaqScripts). n: the number. source: { id, title, ... } (see evidence-card). labels: words. --}}
@include('nasaq::components.ai-citations._logic')
@props(['n', 'source', 'labels' => []])
@php($t = nq_aic_words($labels))
<span x-data="nqAiCitationMarker({!! \Illuminate\Support\Js::from($source['id']) !!})" class="contents">
    <button type="button" data-slot="{{ $attributes->get('data-slot', 'ai-citation-marker') }}" aria-label="{{ nq_aic_fill($t['citation'], ['n' => $n, 'title' => $source['title']]) }}"
        x-ref="trigger" aria-haspopup="dialog" x-on:click="toggle()" x-on:mouseenter="hoverIn()" x-on:mouseleave="hoverOut()" x-bind:aria-expanded="open"
        x-bind:data-popup-open="open ? `` : null" x-bind:data-active="$data.active === sid ? `` : null"
        {{ $attributes->except('data-slot')->cn(['mx-0.5 inline-grid h-4 min-w-4 -translate-y-0.5 place-items-center rounded-full border border-border bg-secondary px-1 align-middle text-[10px] leading-none tabular-nums text-foreground cursor-pointer outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus data-active:border-nq-accent data-active:bg-nq-accent/15 data-popup-open:border-nq-accent']) }}><x-nq::numeric :value="$n" /></button>
    <x-nq::popover.content side="top" class="w-80 p-0">
        <x-nq::ai-citations.evidence-card :source="$source" :index="$n" compact :labels="$labels" class="border-0 bg-transparent" />
    </x-nq::popover.content>
</span>

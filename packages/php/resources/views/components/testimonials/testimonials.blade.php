{{-- <x-nq::testimonials :items="$items" layout="wall" />   <x-nq::testimonials :items="$items" layout="spotlight" :auto-advance="6000" />
     Testimonials as a masonry wall, an equal grid, or a spotlight that steps through them (featured first, then higher rated, then newer).
     items: [ { id, name, role?, company?, quote, rating? (1 to 5), avatarUrl?, featured?, date? } ]. layout: wall | grid | spotlight (default wall).
     actions: [ { id, label, icon? (a lucide name), danger?, disabled?, group? } ], or a closure fn ($item) => [...] for per-item actions. They open on context-click,
     long-press, Shift+F10 or the Menu key on a card, and fire "nq-testimonial-action" { action, id } from the root (it bubbles).
     auto-advance: spotlight only, milliseconds between slides (off by default; stops while hovered or focused, and when reduced motion is preferred).
     labels: array overriding the built-in texts (empty, previous, next, goTo, ratedOutOf). Replace the empty state with the `empty` slot.
     The submit form is <x-nq::testimonials.form>. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'layout' => 'wall', 'actions' => [], 'autoAdvance' => null, 'labels' => [], 'empty' => null])
@include('nasaq::components.testimonials._logic')
@php
    $t = nq_tm_words((array) $labels);
    $list = array_values(array_map(fn ($x) => (array) $x, (array) $items));
    $ordered = $layout === 'spotlight' ? nq_tm_order($list) : $list;
    $actionsOf = fn (array $item): array => array_values(array_map(fn ($a) => (array) $a, (array) ($actions instanceof \Closure ? $actions($item) : $actions)));
    $auto = (int) ($autoAdvance ?? 0);
    $config = ['count' => count($ordered), 'autoAdvance' => $auto];
@endphp
@if (count($list) === 0)
    <div {{ $attributes }}>
        @if ($empty && ! $empty->isEmpty()){{ $empty }}@else<x-nq::states.empty :title="$t['empty']" />@endif
    </div>
@elseif ($layout === 'spotlight')
    <section data-slot="{{ $attributes->get('data-slot', 'testimonial-wall') }}" data-layout="spotlight" aria-roledescription="carousel" x-data="nqTestimonialWall(@js($config))"
        x-on:mouseenter="paused = true" x-on:mouseleave="paused = false" x-on:focusin="paused = true" x-on:focusout="paused = false"
        {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-4') }}>
        <div x-bind:aria-live="paused || ! auto ? 'polite' : 'off'">
            @foreach ($ordered as $i => $item)
                <div x-show="isAt({{ $i }})" @if ($i > 0) style="display: none" @endif>
                    @include('nasaq::components.testimonials._card', ['item' => $item, 't' => $t, 'actions' => $actionsOf($item), 'spotlight' => true])
                </div>
            @endforeach
        </div>
        @if (count($ordered) > 1)
            <div class="flex items-center justify-between gap-3">
                <x-nq::button type="button" variant="secondary" size="icon" :aria-label="$t['previous']" x-on:click="step(-1)">
                    <x-lucide-chevron-left aria-hidden="true" class="rtl:rotate-180" />
                </x-nq::button>
                <div class="flex flex-wrap items-center justify-center gap-1">
                    @foreach ($ordered as $i => $o)
                        <button type="button" aria-label="{{ nq_tm_fill($t['goTo'], ['n' => $i + 1]) }}" x-bind:aria-current="isAt({{ $i }}) ? 'true' : null" x-on:click="go({{ $i }})"
                            class="grid size-6 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <span x-bind:class="isAt({{ $i }}) ? 'bg-primary' : 'bg-nq-line-strong'" class="size-2 rounded-full transition-colors"></span>
                        </button>
                    @endforeach
                </div>
                <x-nq::button type="button" variant="secondary" size="icon" :aria-label="$t['next']" x-on:click="step(1)">
                    <x-lucide-chevron-right aria-hidden="true" class="rtl:rotate-180" />
                </x-nq::button>
            </div>
        @endif
    </section>
@else
    <div data-slot="{{ $attributes->get('data-slot', 'testimonial-wall') }}" data-layout="{{ $layout }}" x-data="nqTestimonialWall(@js($config))"
        {{ $attributes->except('data-slot')->cn([$layout === 'wall' ? 'columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid' : 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4', 'w-full']) }}>
        @foreach ($ordered as $item)
            @include('nasaq::components.testimonials._card', ['item' => $item, 't' => $t, 'actions' => $actionsOf($item), 'spotlight' => false])
        @endforeach
    </div>
@endif

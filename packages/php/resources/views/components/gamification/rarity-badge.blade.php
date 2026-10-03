{{-- <x-nq::gamification.rarity-badge rarity="rare" />
     The rarity as a word with a star, so it is never colour alone. rarity: common | uncommon | rare | epic | legendary. labels: words to override. --}}
@props(['rarity' => 'common', 'labels' => [], 'locale' => null])
@include('nasaq::components.gamification._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_gm_words($locale, $labels);
    $s = nq_gm_rarity_style($rarity);
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'rarity-badge') }}" data-rarity="{{ $rarity }}"
    {{ $attributes->except('data-slot')->cn(['inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-caption font-medium [&_svg]:size-3', 'border-border text-muted-foreground', 'gap-1', $s['ring'], $s['text']]) }}><x-lucide-star aria-hidden="true" class="fill-current" />{{ $t['rarity'][$rarity] ?? $rarity }}</span>

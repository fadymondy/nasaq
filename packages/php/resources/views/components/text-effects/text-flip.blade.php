{{-- <x-nq::text-effects.text-flip :phrases="['faster', 'safer', 'together']" />
     A short phrase that flips to the next one, like a departures board: "Ship faster / calmer / together". All phrases share one grid cell, so the width is the widest phrase and nothing
     around it jumps. The Alpine runtime rotates them; under prefers-reduced-motion it does not rotate and shows the first phrase. Screen readers get all phrases as one list.
     phrases: the texts. interval: milliseconds each stays (2600). by: word (default) | grapheme (Arabic and other joining scripts always flip word by word). paused: stop rotating (x-modelable;
     rotation also stops under the pointer or focus). loop: start again after the last (true). lang: language tag when it differs from the page.
     Event, bubbling from the root: nq-flip-change { index }. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.text-effects._logic')
@props(['phrases' => [], 'interval' => 2600, 'by' => 'word', 'paused' => false, 'loop' => true, 'lang' => null])
@php
    $phrases = array_values($phrases);
    $list = array_map(fn ($p) => nq_text_split((string) $p, $by), $phrases);
    $config = \Illuminate\Support\Js::from(['interval' => (int) $interval, 'loop' => (bool) $loop, 'paused' => (bool) $paused])->toHtml();
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'text-flip') }}" x-data="nqTextFlip({!! $config !!})" x-modelable="paused" x-on:pointerenter="halted = true" x-on:pointerleave="halted = false" x-on:focusin="halted = true"
    x-on:focusout="halted = false" @if ($lang) lang="{{ $lang }}" @endif {{ $attributes->except('data-slot')->cn('relative inline-grid align-baseline [perspective:600px]') }}>
    <span class="sr-only">{{ implode(\Nasaq\Nasaq::rtl() ? '، ' : ', ', $phrases) }}</span>
    @foreach ($list as $i => $phrase)
        @php
            $count = count(array_filter($phrase['tokens'], fn ($t) => ! $t['space']));
            $html = "";
            foreach ($phrase['tokens'] as $token) {
                if ($token['space']) {
                    $html .= e($token['text']);
                    continue;
                }
                $delay = nq_text_stagger($token['order'], $count, 45, 360);
                $html .= '<span data-token data-delay="'.$delay.'" class="inline-block [backface-visibility:hidden]" style="'.nq_flip_style($i === 0, $delay).'">'.e($token['text']).'</span>';
            }
        @endphp
        <span data-phrase aria-hidden="true" @if ($i === 0) data-active @endif class="col-start-1 row-start-1 whitespace-nowrap [transform-style:preserve-3d]">{!! $html !!}</span>
    @endforeach
</span>
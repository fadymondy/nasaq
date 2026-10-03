{{-- <x-nq::text-effects.text-reveal text="Words fade and rise into place as you scroll." />
     Text that fades and rises into place piece by piece when it scrolls into view (the Alpine runtime watches it). Under prefers-reduced-motion it is simply shown. The full text is always there
     for screen readers. text: the text. by: word (default) | grapheme (Arabic and other joining scripts stay word by word). as: element (span). immediate: shown from the start. step: milliseconds
     between pieces (45; the whole reveal is capped at about 900 ms). lang: language tag. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.text-effects._logic')
@props(['text' => '', 'by' => 'word', 'as' => 'span', 'immediate' => false, 'step' => 45, 'lang' => null])
@php
    $split = nq_text_split((string) $text, $by);
    $count = count(array_filter($split['tokens'], fn ($t) => ! $t['space']));
    $html = '';
    foreach ($split['tokens'] as $token) {
        if ($token['space']) {
            $html .= e($token['text']);
            continue;
        }
        $delay = nq_text_stagger($token['order'], $count, (int) $step, 900);
        $html .= '<span data-token data-delay="'.$delay.'" class="inline-block" style="'.nq_reveal_style((bool) $immediate, $delay).'">'.e($token['text']).'</span>';
    }
    $tag = preg_match('/^[a-z][a-z0-9]*$/', (string) $as) ? $as : 'span';
    $config = \Illuminate\Support\Js::from(['immediate' => (bool) $immediate])->toHtml();
@endphp
<{{ $tag }} data-slot="{{ $attributes->get('data-slot', 'text-reveal') }}" data-split="{{ $split['mode'] }}" @if ($immediate) data-shown @endif @if ($lang) lang="{{ $lang }}" @endif x-data="nqTextReveal({!! $config !!})"
    {{ $attributes->except('data-slot')->cn('') }}><span class="sr-only">{{ $text }}</span><span data-visual aria-hidden="true">{!! $html !!}</span></{{ $tag }}>
{{-- <x-nq::text-utilities.user-text block :lines="2" linkify>{{ $comment->body }}</x-nq::text-utilities.user-text>
     User-provided text that could be in either direction. Isolated from the surrounding sentence, aligned to the start edge, optionally clamped to lines and linkified.
     Give the text as the slot or the text prop. block renders a <p> with its own line box. lines clamps with an ellipsis (title shows the full text). as sets the element.
     Server-rendered, no JavaScript. --}}
@props(['text' => null, 'block' => false, 'lines' => null, 'linkify' => false, 'as' => null, 'title' => null])
@php
    $tag = $as ?? ($block ? 'p' : 'span');
    $plain = $text ?? html_entity_decode(strip_tags((string) $slot), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $clamped = $lines !== null && $lines > 0;
    $style = $clamped ? "display: -webkit-box; -webkit-line-clamp: {$lines}; -webkit-box-orient: vertical" : null;
@endphp
<{{ $tag }} data-slot="user-text" dir="auto" @if ($title ?? ($clamped ? $plain : null)) title="{{ $title ?? $plain }}" @endif @if ($style) style="{{ $style }}" @endif
    {{ $attributes->cn(['[unicode-bidi:isolate] text-start', 'block [unicode-bidi:plaintext]' => $block, 'overflow-hidden break-words' => $clamped]) }}>
    @if ($linkify)<x-nq::text-utilities.linkify :text="$plain" />@else{{ $plain }}@endif
</{{ $tag }}>

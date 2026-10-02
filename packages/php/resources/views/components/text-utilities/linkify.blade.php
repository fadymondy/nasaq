{{-- <x-nq::text-utilities.linkify text="Docs at https://example.com or hello@example.com." />
     Turns the http, https, www and email addresses in plain text into links (http, https and mailto only). Each link is isolated and left to right.
     The text is escaped, never parsed as HTML. emails (default true). link-class styles each link. Server-rendered, no JavaScript. --}}
@props(['text' => '', 'emails' => true, 'linkClass' => null])
@php
    $text = (string) $text;
    $urlSource = '(?:https?:\/\/|www\.)[^\s<>"\'،؛؟۔]+';
    $emailSource = '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+';
    $pattern = '/'.($emails ? "($urlSource)|($emailSource)" : "($urlSource)").'/iu';
    $trailing = ['.', ',', ';', ':', '!', '?', "'", '"', '»', '…'];
    $pairs = [')' => '(', ']' => '[', '}' => '{'];
    $trim = function (string $raw) use ($trailing, $pairs): string {
        $chars = preg_split('//u', $raw, -1, PREG_SPLIT_NO_EMPTY);
        $end = count($chars);
        while ($end > 0) {
            $ch = $chars[$end - 1];
            if (in_array($ch, $trailing, true)) { $end--; continue; }
            if (isset($pairs[$ch])) {
                $body = implode('', array_slice($chars, 0, $end));
                if (substr_count($body, $ch) > substr_count($body, $pairs[$ch])) { $end--; continue; }
            }
            break;
        }
        return implode('', array_slice($chars, 0, $end));
    };
    $segments = [];
    $cursor = 0;
    preg_match_all($pattern, $text, $found, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);
    foreach ($found as $m) {
        $isUrl = isset($m[1]) && $m[1][1] >= 0 && $m[1][0] !== '';
        $matched = $isUrl ? $trim($m[1][0]) : ($m[2][0] ?? '');
        if ($matched === '') { continue; }
        $start = $m[0][1];
        if ($start > $cursor) { $segments[] = ['text', substr($text, $cursor, $start - $cursor)]; }
        $segments[] = $isUrl
            ? ['url', $matched, preg_match('/^https?:\/\//i', $matched) ? $matched : 'https://'.$matched]
            : ['email', $matched, 'mailto:'.$matched];
        $cursor = $start + strlen($matched);
    }
    if ($cursor < strlen($text)) { $segments[] = ['text', substr($text, $cursor)]; }
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'linkify') }}" {{ $attributes->except('data-slot') }}>@foreach ($segments as $seg)@if ($seg[0] === 'text'){{ $seg[1] }}@else<bdi dir="ltr"><a href="{{ $seg[2] }}" @if ($seg[0] === 'url') target="_blank" rel="noopener noreferrer nofollow ugc" @endif class="{{ \Nasaq\Cn::merge('[overflow-wrap:anywhere] text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', (string) $linkClass) }}">{{ $seg[1] }}</a></bdi>@endif{!! '' !!}@endforeach</span>

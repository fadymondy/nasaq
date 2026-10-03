{{-- <x-nq::ai-citations.cited-text :text="$answer" :sources="$sources" />
     An answer with [n] markers as small buttons. Hover or press one to see the passage behind it. The Markdown is rendered on the server by <x-nq::markdown>
     (raw HTML dropped); [1], [1, 2] and [2-4] become markers, and a number with no source stays plain text. Needs the Alpine runtime (@nasaqScripts).
     text: Markdown with markers (1-based, into sources). sources: [{ id, title, url?, quote?, ... }]. labels: words. class: extra classes for the Markdown root. --}}
@include('nasaq::components.ai-citations._logic')
@props(['text', 'sources' => [], 'labels' => []])
@php
    $list = array_values($sources);
    $html = \Illuminate\Support\Facades\Blade::render('<x-nq::markdown :source="$md" data-slot="ai-cited-text" :class="$class" />', [
        'md' => nq_aic_link_citations((string) $text, count($list)),
        'class' => $attributes->get('class'),
    ]);
    $html = preg_replace_callback('#<a href="\#nq-cite-(\d+)"[^>]*>.*?</a>#s', function ($m) use ($list, $labels) {
        $n = (int) $m[1];
        $source = $list[$n - 1] ?? null;

        return $source ? \Illuminate\Support\Facades\Blade::render('<x-nq::ai-citations.marker :n="$n" :source="$source" :labels="$labels" />', compact('n', 'source', 'labels')) : $m[0];
    }, (string) $html);
@endphp
{!! $html !!}

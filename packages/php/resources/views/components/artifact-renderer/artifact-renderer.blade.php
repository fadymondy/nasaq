{{-- <x-nq::artifact-renderer :artifact="$payload" x-on:nq-artifact-action="$event.detail.waitUntil(run($event.detail.id))" x-on:nq-artifact-pick="..." />
     Generative UI: turns an agent's JSON into a card, table, chart, markdown, code block, action row, picker, stat row or (opt in) sandboxed
     HTML. The input is validated and sized down on the server and rendered with Nasaq components, so a bad or hostile payload shows an error
     card and never markup. artifact: an array, an object or a JSON string. allow-html: render html artifacts in a sandboxed frame (off: shown as code).
     labels: array overriding the built-in words (invalid, unsupported, yes, no, confirm, cancel, send, sent, choose, failed, source, other, ...).
     Button presses and picks are yours: listen on the root for
       nq-artifact-action   detail: { id, artifactId, waitUntil(promise) }     nq-artifact-pick   detail: { values, artifactId, waitUntil(promise) }
     and pass the work to waitUntil: a promise resolving { error: "..." } (or rejecting) shows a failure. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.artifact-renderer._logic')
@props(['artifact', 'allowHtml' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $words = nq_art_words($locale, $labels);
    $parsed = nq_art_parse($artifact);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'artifact-renderer') }}" data-kind="{{ $parsed['ok'] ? $parsed['artifact']['kind'] : 'invalid' }}" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    @if ($parsed['ok'])
        <x-nq::artifact-renderer.view :artifact="$parsed['artifact']" :allow-html="$allowHtml" :words="$words" :locale="$locale" />
    @else
        <x-nq::alert tone="warning" icon="triangle-alert" :title="isset($parsed['kind']) ? $words['unsupported'] : $words['invalid']">
            <span dir="ltr" class="text-caption">{{ $parsed['error'] }}</span>
        </x-nq::alert>
    @endif
</div>

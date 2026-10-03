{{-- <x-nq::lang-tag lang="ar" />   <x-nq::lang-tag lang="en-GB" region />   <x-nq::lang-tag lang="fr" hue="pink" />
     The language of a piece of content (not of the interface): a small code tag beside a title, a message or a document.
     The code is a Latin token and stays left to right; its accessible name is the language's full name (PHP intl; the code without it).
     lang: a language code (ar, en, en-GB); nothing renders when it is empty. hue: override the built-in table. region: show the full region code. Static. --}}
@props(['lang' => null, 'hue' => null, 'region' => false])
@php
    $hues = ['ar' => 'amber', 'en' => 'blue', 'fr' => 'violet', 'es' => 'orange', 'de' => 'teal', 'tr' => 'red', 'ur' => 'green', 'fa' => 'pink'];
    $base = $lang ? strtolower(preg_split('/[-_]/', (string) $lang)[0]) : '';
    $code = $region ? str_replace('_', '-', (string) $lang) : $base;
    $shown = $region ? $code : $base;
    $name = $shown;
    if (class_exists(\Locale::class)) {
        $name = \Locale::getDisplayLanguage($shown, app()->getLocale()) ?: $shown;
    }
@endphp
@if ($lang)
    <x-nq::badge variant="tag" :hue="$hue ?? ($hues[$base] ?? 'gray')" data-slot="{{ $attributes->get('data-slot', 'lang-tag') }}" data-lang="{{ $base }}" dir="ltr" title="{{ $name }}"
        {{ $attributes->except('data-slot')->cn('font-mono uppercase tracking-wide') }}>
        <span aria-hidden="true">{{ $code }}</span>
        <span class="sr-only">{{ \Nasaq\Nasaq::t('Content language: '.$name, 'لغة المحتوى: '.$name) }}</span>
    </x-nq::badge>
@endif

{{-- <x-nq::profile-page.about :about="$markdown" />   The "About" section: Markdown in readable measure. --}}
@props(['about', 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
@endphp
<x-nq::profile-page.section :title="$t['about']" :locale="$locale" {{ $attributes }}>
    <x-nq::markdown class="max-w-prose" :source="$about" />
</x-nq::profile-page.section>

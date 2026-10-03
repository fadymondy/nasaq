{{-- <x-nq::profile-page.skills :skills="[['name' => 'Figma', 'group' => 'Design', 'level' => 5]]" />   Skills grouped by area, strongest first. --}}
@props(['skills' => [], 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
@endphp
<x-nq::profile-page.section :title="$t['skills']" :description="$t['skillsHint']" :locale="$locale" {{ $attributes }}>
    <x-nq::personal-widgets.skills-widget :skills="$skills" />
</x-nq::profile-page.section>

{{-- <x-nq::glance-surfaces.widget-gallery :added="['steps']"> <x-nq::glance-surfaces.widget-gallery-item id="steps" title="Steps" :sizes="['small','medium']"> previews </x-nq::glance-surfaces.widget-gallery-item> </x-nq::glance-surfaces.widget-gallery>
     A catalogue of widgets: each item shows a live preview, a size picker and an add or remove button.
     added: ids already on the screen (x-modelable: x-model / wire:model). Adding dispatches a bubbling "nq-add" event with { id, size },
     removing dispatches "nq-remove" with { id }. removable="false" shows a disabled "Added" button instead of Remove.
     labels: array overriding the built-in words. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['added' => [], 'removable' => true, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = array_merge(str_starts_with($locale, 'ar') ? [
        'gallery' => 'معرض الودجت',
    ] : [
        'gallery' => 'Widget gallery',
    ], $labels);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'widget-gallery') }}" role="list" aria-label="{{ $t['gallery'] }}" x-data="nqWidgetGallery(@js(array_values($added)))" x-modelable="added"
    {{ $attributes->except('data-slot')->cn('grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]') }}>
    {{ $slot }}
</div>

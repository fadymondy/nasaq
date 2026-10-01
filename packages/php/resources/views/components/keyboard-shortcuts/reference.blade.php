{{-- <x-nq::keyboard-shortcuts.reference :groups="$groups" />  Same as <x-nq::keyboard-shortcuts>. --}}
@props(['groups' => [], 'platform' => 'auto', 'showPlatformSwitch' => true, 'searchable' => true, 'title' => null, 'description' => null, 'locale' => null, 'labels' => []])
<x-nq::keyboard-shortcuts :groups="$groups" :platform="$platform" :show-platform-switch="$showPlatformSwitch" :searchable="$searchable" :title="$title" :description="$description" :locale="$locale" :labels="$labels" {{ $attributes }} />

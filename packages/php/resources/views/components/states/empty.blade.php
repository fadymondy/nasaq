{{-- <x-nq::states.empty title="..." />  Same as <x-nq::states>. --}}
@props(['title' => null, 'description' => null, 'icon' => 'inbox', 'hatch' => false, 'actions' => null])
<x-nq::states :title="$title" :description="$description" :icon="$icon" :hatch="$hatch" :actions="$actions" {{ $attributes }}>{{ $slot }}</x-nq::states>

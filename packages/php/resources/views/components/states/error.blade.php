{{-- <x-nq::states.error title="Could not load orders" description="Check your connection and try again." />
     Errors carry an icon and words, never colour alone. --}}
@props(['title' => null, 'description' => null, 'icon' => 'circle-alert', 'hatch' => false, 'actions' => null])
<x-nq::states kind="error-state" role="alert" icon-class="text-nq-danger-text" :title="$title" :description="$description" :icon="$icon" :hatch="$hatch" :actions="$actions" {{ $attributes }}>{{ $slot }}</x-nq::states>

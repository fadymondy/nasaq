{{-- <x-nq::testimonials.wall :items="$items" layout="grid" />  Same as <x-nq::testimonials>. --}}
@props(['items' => [], 'layout' => 'wall', 'actions' => [], 'autoAdvance' => null, 'labels' => [], 'empty' => null])
<x-nq::testimonials :items="$items" :layout="$layout" :actions="$actions" :auto-advance="$autoAdvance" :labels="$labels" {{ $attributes }}>
    @if ($empty && ! $empty->isEmpty())<x-slot:empty>{{ $empty }}</x-slot:empty>@endif
</x-nq::testimonials>

{{-- <x-nq::entity-list.avatar-stack :people="[['name' => 'Mona'], ['name' => 'Omar']]" :max="4" />
     Overlapping avatars for a project's members, with a "+N" for the rest. A dash when there are none. --}}
@props(['people' => [], 'max' => 4])
@php
    $all = array_values((array) $people);
    $shown = array_slice($all, 0, (int) $max);
    $rest = count($all) - count($shown);
@endphp
@if (! $all)
    <span class="text-muted-foreground">—</span>
@else
    <span data-slot="{{ $attributes->get('data-slot', 'avatar-stack') }}" role="group" aria-label="{{ implode(', ', array_map(fn ($p) => $p['name'], $all)) }}" {{ $attributes->except('data-slot')->cn('inline-flex items-center') }}>
        @foreach ($shown as $p)<x-nq::avatar :name="$p['name']" :src="$p['avatar'] ?? null" size="sm" class="-ms-1.5 ring-2 ring-card first:ms-0" />@endforeach
        @if ($rest > 0)<span class="-ms-1.5 inline-flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-medium tabular-nums text-secondary-foreground ring-2 ring-card">+{{ $rest }}</span>@endif
    </span>
@endif

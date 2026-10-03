{{-- <x-nq::entity-list.tag-list :tags="[['label' => 'VIP', 'hue' => 'violet'], ['label' => 'New']]" :max="3" />
     Tag chips with a "+N" overflow chip that lists the hidden tags in its title. A dash when there are none. --}}
@props(['tags' => [], 'max' => 3])
@php
    $list = array_values(array_map(fn ($t) => is_array($t) ? $t : ['label' => (string) $t], (array) $tags));
    $shown = array_slice($list, 0, (int) $max);
    $hidden = array_slice($list, (int) $max);
@endphp
@if (! $list)
    <span class="text-muted-foreground">—</span>
@else
    <span data-slot="{{ $attributes->get('data-slot', 'tag-list') }}" {{ $attributes->except('data-slot')->cn('inline-flex flex-wrap items-center gap-1') }}>
        @foreach ($shown as $tag)<x-nq::badge variant="tag" :hue="$tag['hue'] ?? 'gray'">{{ $tag['label'] }}</x-nq::badge>@endforeach
        @if ($hidden)<x-nq::badge variant="outline" title="{{ implode(', ', array_map(fn ($t) => $t['label'], $hidden)) }}" class="tabular-nums">+{{ count($hidden) }}</x-nq::badge>@endif
    </span>
@endif

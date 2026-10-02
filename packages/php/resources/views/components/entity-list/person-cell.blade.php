{{-- <x-nq::entity-list.person-cell :person="['name' => 'Omar Hassan', 'avatar' => '/o.jpg']" />
     An owner or assignee: small avatar and name. A dash when there is no person. --}}
@props(['person' => null])
@if (! $person)
    <span class="text-muted-foreground">—</span>
@else
    <span data-slot="{{ $attributes->get('data-slot', 'person-cell') }}" {{ $attributes->except('data-slot')->cn('inline-flex min-w-0 items-center gap-2') }}>
        <x-nq::avatar :name="$person['name']" :src="$person['avatar'] ?? null" size="sm" />
        <span class="truncate text-body-sm">{{ $person['name'] }}</span>
    </span>
@endif

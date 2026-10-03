{{-- <x-nq::entity-list.identity avatar-name="Mona Ali" subtitle="mona@example.com">Mona Ali</x-nq::entity-list.identity>
     The first cell of a row and the head of a card: avatar or logo, name (the slot), subtitle (prop, or the `subtitle` slot).
     shape: circle (people) | square (companies, projects: logos are never cropped to a circle). size: md | lg. --}}
@props(['avatarName' => '', 'avatar' => null, 'shape' => 'circle', 'size' => 'md', 'subtitle' => null])
<div data-slot="{{ $attributes->get('data-slot', 'entity-identity') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 items-center gap-3') }}>
    <x-nq::avatar :name="$avatarName" :src="$avatar" :shape="$shape" :size="$size" />
    <div class="flex min-w-0 flex-col">
        <span class="truncate text-label text-foreground">{{ $slot }}</span>
        @if ($subtitle)<span class="truncate text-body-sm text-muted-foreground">{{ $subtitle }}</span>@endif
    </div>
</div>

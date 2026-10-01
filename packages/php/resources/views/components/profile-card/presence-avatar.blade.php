{{-- <x-nq::profile-card.presence-avatar :person="['name' => 'Sara Nasser', 'presence' => 'online']" size="lg" />
     An avatar with its presence dot at the corner. person: name, avatar (a URL), presence. size: xs | sm | md | lg. --}}
@props(['person', 'size' => 'md'])
<span data-slot="presence-avatar" {{ $attributes->cn('relative inline-flex shrink-0') }}>
    <x-nq::avatar :name="$person['name'] ?? ''" :src="$person['avatar'] ?? null" :size="$size" />
    @if (! empty($person['presence']))
        <x-nq::profile-card.presence-dot :presence="$person['presence']" class="absolute -end-0.5 -bottom-0.5 border-2 border-popover" />
    @endif
</span>

{{-- Internal: the inside of one testimonial card (stars, quote, person). Shares the variables of _card. --}}
@if ($rating)
    <span role="img" aria-label="{{ nq_tm_fill($t['ratedOutOf'], ['n' => $rating]) }}" class="inline-flex gap-0.5">
        @foreach ([1, 2, 3, 4, 5] as $n)
            <x-lucide-star aria-hidden="true" class="size-4 {{ $n <= $rating ? 'fill-nq-accent text-nq-accent' : 'text-nq-line-strong' }}" />
        @endforeach
    </span>
@endif
<blockquote class="text-pretty {{ $spotlight ? 'text-heading-3 leading-relaxed' : 'text-body' }}">{{ $item['quote'] }}</blockquote>
<figcaption class="flex min-w-0 items-center gap-3">
    <x-nq::avatar :name="$item['name']" :src="$item['avatarUrl'] ?? null" />
    <span class="flex min-w-0 flex-col">
        <span class="truncate font-medium {{ $spotlight ? 'text-body' : 'text-body-sm' }}">{{ $item['name'] }}</span>
        @if ($sub)<span class="truncate text-caption text-muted-foreground">{{ $sub }}</span>@endif
    </span>
</figcaption>

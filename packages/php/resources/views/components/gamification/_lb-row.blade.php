<li @if ($isYou) data-you="" aria-current="true" @endif class="flex min-h-14 items-center gap-3 px-4 py-2 {{ $pin ? 'border-t border-border bg-card' : ($isYou ? 'bg-nq-selected' : '') }}">
    <span class="w-8 shrink-0 text-center text-label tabular-nums text-muted-foreground"><span class="sr-only">{{ $t['rank'] }} </span>{{ nq_gm_num($e['rank'], $locale) }}</span>
    <x-nq::avatar :name="$e['name']" :src="$e['avatar'] ?? null" size="md" />
    <span class="flex min-w-0 flex-1 flex-col">
        <span class="flex items-center gap-1.5">
            <bdi dir="auto" class="truncate text-label text-foreground">{{ $e['name'] }}</bdi>
            @if ($isYou)<x-nq::badge variant="brand">{{ $t['you'] }}</x-nq::badge>@endif
        </span>
        @if (! empty($e['subtitle']))<span dir="auto" class="truncate text-caption text-muted-foreground">{{ $e['subtitle'] }}</span>@endif
    </span>
    @include('nasaq::components.gamification._movement', ['rank' => $e['rank'], 'previousRank' => $e['previousRank'] ?? null])
    <span class="min-w-16 text-end text-body-sm">
        <span class="tabular-nums text-foreground">{{ nq_gm_num($e['score'], $locale) }}@if ($unit)<span class="ms-1 text-caption text-muted-foreground">{{ $unit }}</span>@endif</span>
    </span>
</li>

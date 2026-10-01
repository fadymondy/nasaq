{{-- Internal: the icon, name, status line and dot of one paired-browser row. Included by kill-switch with $b, $t, $current and $isOnline in scope. --}}
<span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4"><x-lucide-globe aria-hidden="true" /></span>
<div class="flex min-w-0 flex-1 flex-col">
    <span class="flex flex-wrap items-center gap-2 text-label text-foreground">
        {{ $b['name'] }}
        @if ($current)<x-nq::badge variant="brand">{{ $t['thisBrowser'] }}</x-nq::badge>@endif
    </span>
    <span class="text-caption text-muted-foreground">
        {{ ! empty($b['device']) ? $b['device'].' · ' : '' }}
        @if ($isOnline){{ $t['online'] }}@elseif (isset($b['lastSeen'])){{ $t['lastSeen'] }} <x-nq::numeric.date-time :value="$b['lastSeen']" relative />@else{{ $t['offline'] }}@endif
    </span>
</div>
<span aria-hidden="true" class="size-2 rounded-full {{ $isOnline ? 'bg-nq-success' : 'bg-nq-line-strong' }}"></span>

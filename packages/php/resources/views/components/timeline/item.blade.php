{{-- <x-nq::timeline.item :actor="['name' => 'Sara Alharbi']" title="Assigned MH-142 to Khaled" :time="$at" />
     <x-nq::timeline.item title="Pull request #48 opened" description="Post-login redirect" time="2026-09-27T10:00:00Z"><x-slot:icon><x-lucide-git-pull-request /></x-slot:icon></x-nq::timeline.item>
     icon slot (marker glyph) wins over actor ['name' => ..., 'avatar' => url]. time: DateTime, timestamp or string, shown relative ("3 hours ago" / "قبل 3 ساعات").
     The default slot is extra content under the description (an attachment, a diff, actions). <x-slot:title> / <x-slot:description> take markup. --}}
@props(['icon' => null, 'actor' => null, 'title' => null, 'description' => null, 'time' => null])
@php
    $filled = fn ($v) => $v !== null && ! ($v instanceof \Illuminate\View\ComponentSlot && $v->isEmpty());
    // Carbon names the zone of "…Z" strings "Z", which IntlDateFormatter rejects: hand numeric.date-time a UTC date instead.
    if (is_string($time) && ! is_numeric($time)) {
        $time = \Carbon\Carbon::parse($time);
        if ($time->getTimezone()->getName() === 'Z') {
            $time = $time->setTimezone('UTC');
        }
    }
@endphp
<li data-slot="timeline-item" {{ $attributes->cn('group/timeline grid grid-cols-[2rem_1fr] gap-x-3') }}>
    <div class="flex flex-col items-center">
        <span data-slot="timeline-marker" class="flex size-8 shrink-0 items-center justify-center">
            @if ($filled($icon))
                <span class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">{{ $icon }}</span>
            @elseif ($actor)
                <x-nq::avatar :name="$actor['name']" :src="$actor['avatar'] ?? null" size="md" />
            @else
                <span aria-hidden="true" class="size-2.5 rounded-full border-2 border-nq-line bg-background"></span>
            @endif
        </span>
        <span aria-hidden="true" data-slot="timeline-rail" class="my-1 w-px flex-1 bg-border group-last/timeline:hidden"></span>
    </div>
    <div data-slot="timeline-content" class="flex min-w-0 flex-col gap-1 pb-6 pt-1 group-last/timeline:pb-0">
        <div class="flex items-baseline justify-between gap-3">
            <p class="min-w-0 text-body-sm font-medium text-foreground">{{ $title }}</p>
            @if ($time !== null)
                <x-nq::numeric.date-time :value="$time" relative class="shrink-0 text-caption text-muted-foreground" />
            @endif
        </div>
        @if ($filled($description))
            <p class="text-body-sm text-muted-foreground">{{ $description }}</p>
        @endif
        @if ($slot->isNotEmpty())
            <div class="flex flex-wrap items-center gap-2">{{ $slot }}</div>
        @endif
    </div>
</li>

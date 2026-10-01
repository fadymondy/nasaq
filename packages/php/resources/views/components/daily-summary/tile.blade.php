{{-- <x-nq::daily-summary.tile label="Water"><x-slot:icon><x-lucide-droplets /></x-slot:icon></x-nq::daily-summary.tile>
     The icon and label row at the top of a summary tile. Internal part of daily-summary. --}}
@props(['label' => null, 'icon' => null])
<div class="flex items-center gap-2">
    <span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4">{{ $icon }}</span>
    <div class="min-w-0 truncate text-body-sm text-muted-foreground">{{ $label ?? $slot }}</div>
</div>

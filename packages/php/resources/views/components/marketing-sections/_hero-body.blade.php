{{-- Internal: the inside of app-mockup-hero (the same markup over any backdrop). --}}
@php($has = fn ($v) => $v !== null && trim((string) $v) !== '')
<div class="@container mx-auto flex w-full max-w-5xl min-w-0 flex-col items-center gap-10 px-4 pt-14 pb-0 text-center @2xl:pt-20">
    <div class="flex min-w-0 max-w-2xl flex-col items-center gap-4">
        @if ($has($eyebrow))<div class="eyebrow text-nq-brand">{{ $eyebrow }}</div>@endif
        <h1 class="font-semibold text-display text-foreground text-balance">{{ $title }}</h1>
        @if ($has($description))<p class="text-body text-nq-fg-body text-pretty">{{ $description }}</p>@endif
        @if ($has($actions))<div class="flex flex-wrap justify-center gap-2 pt-2">{{ $actions }}</div>@endif
        @if ($has($proof))<div class="text-caption text-muted-foreground">{{ $proof }}</div>@endif
    </div>
    <div class="w-full min-w-0 max-w-4xl" style="mask-image: linear-gradient(to bottom, black 70%, transparent); -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent)">
        <x-nq::screenshot-frame :variant="$frame" :title="$frameTitle" :label="$mockupLabel" class="shadow-floating">{{ $slot }}</x-nq::screenshot-frame>
    </div>
</div>

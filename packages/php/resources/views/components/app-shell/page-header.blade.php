{{-- <x-nq::app-shell.page-header title="Overview" description="Last 7 days"> <x-slot:icon>...</x-slot:icon> <x-slot:actions>...</x-slot:actions> </x-nq::app-shell.page-header>
     The page's title row: a big title, an optional line under it, and the page's controls at the inline end. --}}
@props(['title' => null, 'description' => null, 'icon' => null, 'actions' => null])
<div data-slot="{{ $attributes->get('data-slot', 'app-page-header') }}" {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center gap-x-4 gap-y-3') }}>
    <div class="flex min-w-0 flex-1 items-center gap-3">
        @if ($icon !== null && ! $icon->isEmpty())<span class="inline-flex shrink-0">{{ $icon }}</span>@endif
        <div class="grid min-w-0 gap-1">
            <h1 class="truncate text-h2 text-foreground">{{ $title }}</h1>
            @if ($description)<div class="text-body-sm text-muted-foreground">{{ $description }}</div>@endif
        </div>
    </div>
    @if ($actions !== null && ! $actions->isEmpty())<div class="flex flex-wrap items-center gap-2">{{ $actions }}</div>@endif
    {{ $slot }}
</div>

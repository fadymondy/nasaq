{{-- <x-nq::extension-popup.mini-card title="Saved today" icon="bookmark" :status="['label' => 'Synced', 'tone' => 'success']" :value="12" hint="Pages and snippets">buttons</x-nq::extension-popup.mini-card>
     One small card inside the popup: a title with a status pill, one figure, a hint and a row of controls (the slot).
     icon is a Lucide icon name. status tone: neutral | success | warning | danger | info. --}}
@props(['title', 'icon' => null, 'status' => null, 'value' => null, 'hint' => null])
<section data-slot="{{ $attributes->get('data-slot', 'extension-mini-card') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-2 rounded-lg border border-border bg-card p-3') }}>
    <div class="flex items-center gap-2">
        @if ($icon)<span aria-hidden="true" class="shrink-0 text-muted-foreground [&_svg]:size-4"><x-dynamic-component :component="'lucide-'.$icon" /></span>@endif
        <h3 class="min-w-0 flex-1 truncate text-label font-medium text-foreground">{{ $title }}</h3>
        @if ($status)
            <x-nq::badge :variant="$status['tone'] ?? 'neutral'">{{ $status['label'] }}</x-nq::badge>
        @endif
    </div>
    @if ($value !== null)<p class="text-h2 tabular-nums text-foreground">{{ $value }}</p>@endif
    @if ($hint)<p class="text-caption text-muted-foreground">{{ $hint }}</p>@endif
    {{ $slot }}
</section>

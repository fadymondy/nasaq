{{-- <x-nq::extension-popup.option-row label="Show badge" description="On the toolbar icon."><x-slot:control><x-nq::switch aria-label="Show badge" /></x-slot:control></x-nq::extension-popup.option-row>
     A label and hint at the inline start, a control at the end. Give the control its own accessible name. --}}
@props(['label', 'description' => null, 'control' => null])
<div data-slot="extension-option-row" {{ $attributes->cn('flex items-center justify-between gap-4 py-1') }}>
    <div class="min-w-0">
        <p class="text-label text-foreground">{{ $label }}</p>
        @if ($description)<p class="text-caption text-muted-foreground">{{ $description }}</p>@endif
    </div>
    <div class="shrink-0">{{ $control }}</div>
</div>

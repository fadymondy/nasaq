{{-- <x-nq::theme-presets.scope preset="rose-light" class="rounded-card border p-4"> ... </x-nq::theme-presets.scope>
     Renders its content in a preset without touching the rest of the page: a live preview beside the picker.
     preset: a preset id, or a preset array (id, mode, brand, brandDark, accent). overrides: ['brand' => '#RRGGBB', ...] over the preset.
     With nqThemePreset (Alpine) follow the picker: x-bind:data-theme="mode" and x-bind:style="scopeStyle" on this tag. --}}
@include('nasaq::components.theme-presets._theme-presets')
@props(['preset' => 'nasaq', 'overrides' => []])
@php
    $found = is_array($preset) ? $preset : (collect(nq_theme_presets())->firstWhere('id', $preset) ?? nq_theme_presets()[0]);
    $m = ($found['mode'] ?? 'dark') === 'dark' ? 'd' : 'l';
    // Pin the mode's roles inline: inside a dark page `.dark [data-brand]` would otherwise outrank a light scope.
    $vars = nq_theme_vars($found, $overrides ?? []) + [
        '--nq-brand' => 'var(--nq-brand-'.$m.')',
        '--nq-action' => 'var(--nq-action-'.$m.')',
        '--nq-on-action' => 'var(--nq-on-action-'.$m.')',
        '--nq-primary-action' => 'var(--nq-action-'.$m.')',
    ];
    $style = collect($vars)->map(fn ($v, $k) => $k.': '.$v)->implode('; ');
@endphp
<div data-slot="theme-preset-scope" data-theme="{{ $found['mode'] ?? 'dark' }}" {{ $attributes->only(['x-bind:data-theme', ':data-theme'])->cn('contents') }}>
    <div data-brand="runtime" style="{{ $style }}" {{ $attributes->except(['x-bind:data-theme', ':data-theme'])->cn('bg-background text-foreground') }}>{{ $slot }}</div>
</div>

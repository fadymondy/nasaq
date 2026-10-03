{{-- <div x-data="nqThemePreset()"><x-nq::theme-presets.picker x-model="presetId" /></div>   <x-nq::theme-presets.picker :overrides="['brand' => $tenant->brand]" default-value="purple-light" />
     A gallery of named themes (light or dark plus brand colours); it only reports the choice (a radio group, value is x-modelable: x-model / wire:model).
     Wrap it in nqThemePreset (Alpine) to remember and apply the choice, or preview a region with <x-nq::theme-presets.scope>.
     presets: default the eight built-in ones (Nasaq, purple, rose and emerald, each dark and light); each is id, label, labelAr, mode, brand, brandDark, accent.
     overrides: ['brand' => '#RRGGBB', 'brandDark' =>, 'accent' =>] shown in every preview, so a tenant colour can be compared across light and dark.
     default-value: the selected id (default the first). label: heading (default "Theme"); false hides it, then name the group with aria-label.
     columns: 2 | 3 | 4 (default 4). disabled. name: submits the chosen id. labels: array overriding the gallery's words. --}}
@include('nasaq::components.appearance-pickers._appearance')
@include('nasaq::components.theme-presets._theme-presets')
@props(['presets' => null, 'overrides' => [], 'defaultValue' => null, 'label' => null, 'columns' => 4, 'disabled' => false, 'name' => null, 'labels' => []])
@php
    $presets = $presets ?? nq_theme_presets();
    $ar = \Nasaq\Nasaq::rtl();
    $themes = array_map(fn ($p) => [
        'id' => $p['id'],
        'label' => ($ar && ! empty($p['labelAr'])) ? $p['labelAr'] : $p['label'],
        'mode' => $p['mode'],
        'swatches' => nq_theme_swatches($p, $overrides ?? []),
    ], array_values($presets));
    $t = nq_appearance_t($labels);
    $current = (string) ($defaultValue ?? ($themes[0]['id'] ?? ''));
    $heading = $label === null ? $t['theme'] : $label;
    $uid = 'nq-theme-'.substr(md5(json_encode([$themes, $name])), 0, 8);
    $cols = [2 => 'grid-cols-2', 3 => 'grid-cols-2 sm:grid-cols-3', 4 => 'grid-cols-2 sm:grid-cols-4'][(int) $columns] ?? 'grid-cols-2 sm:grid-cols-4';
    $model = $attributes->whereStartsWith(['x-model', 'wire:model']);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'theme-gallery') }}" {{ $attributes->except('data-slot')->except('aria-label')->whereDoesntStartWith(['x-model', 'wire:model'])->cn('flex min-w-0 flex-col gap-2') }}>
    @if ($label !== false)<div id="{{ $uid }}" class="text-label text-foreground">{{ $heading }}</div>@endif
    <div role="radiogroup" x-data="nqRadioGroup(@js($current))" x-modelable="value" x-bind="root" {{ $model }}
        @if ($label !== false) aria-labelledby="{{ $uid }}" @else aria-label="{{ $attributes->get('aria-label', $t['theme']) }}" @endif
        @if ($disabled) aria-disabled="true" data-disabled @endif
        class="grid gap-3 {{ $cols }}">
        @foreach ($themes as $theme)
            @php
                $id = (string) $theme['id'];
                $on = $id === $current;
                [$page, $surface, $text, $accent] = nq_appearance_colors($theme);
            @endphp
            <button type="button" role="radio" data-slot="theme-card" x-bind="radio(@js($id))" aria-checked="{{ $on ? 'true' : 'false' }}" tabindex="{{ $on ? 0 : -1 }}"
                @if ($on) data-checked @else data-unchecked @endif
                @if ($disabled) disabled data-disabled @endif
                class="{{ nq_appearance_card() }}">
                <span aria-hidden="true" class="relative flex h-20 overflow-hidden rounded-control border border-border" style="background: {{ $page }}">
                    <span class="flex w-1/3 flex-col gap-1 p-1.5" style="background: {{ $surface }}">
                        <span class="h-1.5 w-full rounded-full opacity-80" style="background: {{ $accent }}"></span>
                        <span class="h-1 w-3/4 rounded-full opacity-40" style="background: {{ $text }}"></span>
                        <span class="h-1 w-1/2 rounded-full opacity-40" style="background: {{ $text }}"></span>
                    </span>
                    <span class="flex flex-1 flex-col gap-1.5 p-2">
                        <span class="h-2 w-2/3 rounded-full opacity-70" style="background: {{ $text }}"></span>
                        <span class="h-1.5 w-full rounded-full opacity-30" style="background: {{ $text }}"></span>
                        <span class="h-1.5 w-5/6 rounded-full opacity-30" style="background: {{ $text }}"></span>
                        <span class="mt-auto h-3.5 w-1/3 rounded-control" style="background: {{ $accent }}"></span>
                    </span>
                </span>
                <span class="flex min-w-0 items-center gap-1.5 px-0.5 pb-0.5">
                    @if (($theme['mode'] ?? null) === 'dark')<x-lucide-moon aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />
                    @elseif (($theme['mode'] ?? null) === 'light')<x-lucide-sun aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />@endif
                    <span class="min-w-0 flex-1">
                        <span class="block truncate text-label text-foreground">{{ $theme['label'] }}</span>
                    </span>
                    <span data-slot="radio-indicator" x-show="isChecked(@js($id))" @unless ($on) style="display: none" @endunless class="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                        <x-lucide-check aria-hidden="true" class="size-3" />
                    </span>
                </span>
            </button>
        @endforeach
        @if ($name)<input type="hidden" name="{{ $name }}" x-bind:value="value ?? ''" value="{{ $current }}" @if ($disabled) disabled @endif>@endif
    </div>
</div>

{{-- <x-nq::appearance-pickers.wallpaper-picker :wallpapers="[['id' => 'dawn', 'label' => 'Dawn', 'background' => 'linear-gradient(red, orange)', 'group' => 'Gradients']]" default-value="dawn" :dim="20" upload />
     Pick a wallpaper from gradients, colours and pictures, optionally upload your own and dim it so text stays readable. It only reports the choice; paint it with the
     tile's background and the dim as an overlay. x-modelable="selected" (the id, or "__none__" for none). Bubbling events: "nq-change" { value: id | null },
     "nq-dim" { value: 0 to 60 } and "nq-upload" { file } (add the resulting wallpaper to the list yourself).
     wallpapers: id, label, background (a CSS background, or a picture URL starting with http, /, ./ or data:image), group (the heading it is listed under).
     default-value: the selected id (default none). dim: the starting dim, 0 to 60 percent; passing it shows the slider. upload: shows the upload tile; accept: file types (default image/*).
     allow-none: offer a None tile first (default true). label: heading (default "Wallpaper"; false hides it). disabled. labels: array overriding the words. --}}
@include('nasaq::components.appearance-pickers._appearance')
@props(['wallpapers', 'defaultValue' => null, 'dim' => null, 'upload' => false, 'accept' => 'image/*', 'allowNone' => true, 'label' => null, 'disabled' => false, 'labels' => []])
@php
    $t = nq_appearance_t($labels);
    $none = '__none__';
    $current = $defaultValue === null ? $none : (string) $defaultValue;
    $groups = nq_appearance_groups($wallpapers);
    $keys = array_keys($groups);
    $uid = 'nq-wall-'.substr(md5(json_encode($wallpapers)), 0, 8);
    $tile = 'aspect-[4/3] w-full rounded-control border border-border';
    $dimValue = max(0, min(60, (int) round((float) ($dim ?? 0))));
    $mark = 'absolute end-2 top-2 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground';
    $card = nq_appearance_card().' p-1';
@endphp
<div data-slot="wallpaper-picker" x-data="nqWallpaperPicker(@js($current), @js($dimValue))" x-modelable="selected" {{ $attributes->cn('flex min-w-0 flex-col gap-3') }}>
    @if ($label !== false)<div id="{{ $uid }}" class="text-label text-foreground">{{ $label ?? $t['wallpaper'] }}</div>@endif
    <div role="radiogroup" x-data="nqRadioGroup(@js($current))" x-modelable="value" x-model="selected" x-bind="root"
        @if ($label !== false) aria-labelledby="{{ $uid }}" @else aria-label="{{ $t['wallpaper'] }}" @endif
        @if ($disabled) aria-disabled="true" data-disabled @endif
        class="flex flex-col gap-3">
        @foreach ($groups as $group => $items)
            @php $first = $loop->first; $last = $loop->last; @endphp
            <div class="flex flex-col gap-1.5">
                @if ($group !== '')<div class="text-caption text-muted-foreground">{{ $group }}</div>@endif
                <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    @if ($first && $allowNone)
                        <button type="button" role="radio" data-slot="wallpaper-none" x-bind="radio(@js($none))" aria-label="{{ $t['none'] }}" aria-checked="{{ $current === $none ? 'true' : 'false' }}" tabindex="{{ $current === $none ? 0 : -1 }}"
                            @if ($current === $none) data-checked @else data-unchecked @endif
                            @if ($disabled) disabled data-disabled @endif
                            class="{{ $card }}">
                            <span aria-hidden="true" class="{{ $tile }} grid place-items-center bg-nq-surface-soft text-caption text-muted-foreground">{{ $t['none'] }}</span>
                            <span data-slot="radio-indicator" x-show="isChecked(@js($none))" @if ($current !== $none) style="display: none" @endif class="{{ $mark }}"><x-lucide-check aria-hidden="true" class="size-3" /></span>
                        </button>
                    @endif
                    @foreach ($items as $w)
                        @php $on = (string) $w['id'] === $current; @endphp
                        <button type="button" role="radio" data-slot="wallpaper-tile" x-bind="radio(@js((string) $w['id']))" aria-label="{{ $w['label'] }}" title="{{ $w['label'] }}" aria-checked="{{ $on ? 'true' : 'false' }}" tabindex="{{ $on ? 0 : -1 }}"
                            @if ($on) data-checked @else data-unchecked @endif
                            @if ($disabled) disabled data-disabled @endif
                            class="{{ $card }}">
                            <span aria-hidden="true" class="{{ $tile }}" style="background: {{ nq_appearance_wallpaper_css($w['background']) }}"></span>
                            <span data-slot="radio-indicator" x-show="isChecked(@js((string) $w['id']))" @unless ($on) style="display: none" @endunless class="{{ $mark }}"><x-lucide-check aria-hidden="true" class="size-3" /></span>
                        </button>
                    @endforeach
                    @if ($last && $upload)
                        <button type="button" @if ($disabled) disabled @endif x-on:click="$refs.file.click()"
                            class="flex aspect-[4/3] flex-col items-center justify-center gap-1 self-start rounded-card border border-border border-dashed p-1 text-caption text-muted-foreground outline-none transition-colors hover:border-nq-line-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50">
                            <x-lucide-image-plus aria-hidden="true" class="size-4" />
                            {{ $t['upload'] }}
                        </button>
                    @endif
                </div>
            </div>
        @endforeach
    </div>
    @if ($upload)<input type="file" x-ref="file" accept="{{ $accept }}" hidden x-on:change="pick($event)">@endif
    @if ($dim !== null)
        <div data-slot="wallpaper-dim" x-bind:class="selected === '{{ $none }}' ? 'pointer-events-none opacity-50' : ''" @if ($current === $none || $disabled) class="pointer-events-none opacity-50" @endif>
            <x-nq::slider :label="$t['dim']" :min="0" :max="0.6" :step="0.05" :value="$dimValue / 100" :format="['style' => 'percent']" :disabled="$disabled" x-model="dimFraction" />
        </div>
    @endif
</div>

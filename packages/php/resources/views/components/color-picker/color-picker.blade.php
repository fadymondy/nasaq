{{-- <x-nq::color-picker x-model="color" aria-label="Label colour" />
     A swatch trigger that opens a popover with a swatch grid, a validated hex field and an optional native colour input.
     value: the chosen colour, a hex string with a leading hash or a CSS custom property name ("--nq-tag-red"). It is x-modelable (x-model / wire:model).
     swatches: array of ['value' => '--nq-tag-red', 'label' => 'Red'] (default: the nine --nq-tag-* hues). mode: swatches | hex (hex hides the grid). columns: swatches per row (default 5).
     allow-hex / allow-native (default true), disabled, invalid, name (a hidden input carries the value), placeholder, locale, dir, aria-label. Fires "color-change" ({ value }).
     Inside <x-nq::field> it takes the field's name, disabled and invalid state. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['invalid' => false, 'disabled' => false, 'name' => null])
@props(['value' => null, 'swatches' => null, 'mode' => 'swatches', 'columns' => 5, 'allowHex' => true, 'allowNative' => true, 'placeholder' => null, 'locale' => null, 'dir' => null, 'open' => false])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = fn ($en, $arabic) => $ar ? $arabic : $en;
    $rtl = $dir ? $dir === 'rtl' : $ar;
    $names = $ar
        ? ['gray' => 'رمادي', 'red' => 'أحمر', 'orange' => 'برتقالي', 'amber' => 'كهرماني', 'green' => 'أخضر', 'teal' => 'تركوازي', 'blue' => 'أزرق', 'violet' => 'بنفسجي', 'pink' => 'وردي']
        : ['gray' => 'Gray', 'red' => 'Red', 'orange' => 'Orange', 'amber' => 'Amber', 'green' => 'Green', 'teal' => 'Teal', 'blue' => 'Blue', 'violet' => 'Violet', 'pink' => 'Pink'];
    $swatches = collect($swatches ?? array_map(fn ($hue) => ['value' => '--nq-tag-'.$hue, 'label' => $names[$hue]], array_keys($names)))->values()->all();
    $showSwatches = $mode !== 'hex' && count($swatches) > 0;
    $choose = $t('Choose colour', 'اختيار اللون');
    $none = $t('No colour', 'بلا لون');
    $label = $attributes->get('aria-label') ?? $choose;
    $css = fn ($v) => str_starts_with(trim($v), '--') ? 'var('.trim($v).')' : trim($v);
    $fieldName = $attributes->get('name', $name);
    $init = ['value' => $value, 'swatches' => $swatches, 'placeholder' => $placeholder ?? $none, 'none' => $none, 'choose' => $label, 'rtl' => $rtl];
    $triggerClass = [
        'flex h-control w-full min-w-0 items-center gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground',
        'min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq',
        'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus',
        'data-invalid:border-nq-danger aria-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50',
        'pointer-coarse:text-[16px]',
    ];
    $chip = 'inline-block size-5 shrink-0 rounded-[6px] border border-nq-line-strong';
    $swatchClass = 'relative aspect-square w-full cursor-default rounded-control border border-nq-line-strong outline-none transition-shadow duration-150 ease-nq hover:shadow-[0_0_0_2px_var(--nq-line-strong)] data-checked:shadow-[0_0_0_2px_var(--popover),0_0_0_4px_var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
@endphp
<div data-slot="color-picker" x-data="nqColorPicker({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="color" class="contents">
    <x-nq::popover :open="$open">
        <button type="button" x-ref="trigger" data-slot="color-picker-trigger" aria-haspopup="dialog" x-on:click="toggle()"
            :aria-expanded="open" x-bind:data-popup-open="open ? '' : undefined" x-bind:aria-label="triggerLabel"
            @if ($invalid) data-invalid aria-invalid="true" @endif
            @if ($disabled) disabled data-disabled @endif
            {{ $attributes->except(['aria-label', 'name'])->cn($triggerClass) }}>
            <span aria-hidden="true" data-slot="color-picker-chip" x-bind:style="color ? { backgroundColor: css(color) } : null"
                x-bind:class="color ? '' : 'border-dashed bg-transparent'" class="{{ $chip }}"></span>
            <span class="min-w-0 flex-1 truncate text-start" x-bind:class="label ? '' : 'text-muted-foreground'" dir="auto" x-text="label ?? placeholder">{{ $placeholder ?? $none }}</span>
            <x-lucide-chevrons-up-down aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
        </button>
        @if ($fieldName)
            <input type="hidden" name="{{ $fieldName }}" x-bind:value="color ?? ''">
        @endif
        <x-nq::popover.content align="start" dir="{{ $rtl ? 'rtl' : 'ltr' }}" lang="{{ $locale }}" aria-label="{{ $choose }}" class="w-64 p-3"
            x-effect="open && $nextTick(() => syncDraft())">
            <div class="flex flex-col gap-3">
                @if ($showSwatches)
                    <div role="radiogroup" aria-label="{{ $t('Colours', 'الألوان') }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}" data-slot="color-picker-swatches" class="grid gap-2"
                        style="grid-template-columns: repeat({{ (int) $columns }}, minmax(0, 1fr))" x-on:keydown="swatchKey($event)">
                        @foreach ($swatches as $swatch)
                            <button type="button" role="radio" data-slot="color-picker-swatch" data-value="{{ $swatch['value'] }}" aria-label="{{ $swatch['label'] }}" title="{{ $swatch['label'] }}"
                                style="background-color: {{ $css($swatch['value']) }}"
                                x-bind:aria-checked="isOn({!! \Illuminate\Support\Js::from($swatch['value']) !!})" x-bind:tabindex="tab({!! \Illuminate\Support\Js::from($swatch['value']) !!})"
                                x-bind:data-checked="isOn({!! \Illuminate\Support\Js::from($swatch['value']) !!}) ? '' : null" x-bind:data-unchecked="isOn({!! \Illuminate\Support\Js::from($swatch['value']) !!}) ? null : ''"
                                x-on:click="pick({!! \Illuminate\Support\Js::from($swatch['value']) !!})" class="{{ $swatchClass }}"></button>
                        @endforeach
                    </div>
                @endif
                @if ($allowHex)
                    <div class="flex flex-col gap-1">
                        <div class="flex h-control items-center gap-2 rounded-control border border-input bg-card px-2 focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus"
                            x-bind:class="showError ? 'border-nq-danger' : ''">
                            <span aria-hidden="true" data-slot="color-picker-chip" x-bind:style="draftColor ? { backgroundColor: css(draftColor) } : null"
                                x-bind:class="draftColor ? '' : 'border-dashed bg-transparent'" class="{{ $chip }}"></span>
                            <input type="text" dir="ltr" inputmode="text" autocomplete="off" spellcheck="false" maxlength="7" aria-label="{{ $t('Hex value', 'القيمة السداسية') }}"
                                data-slot="color-picker-hex" x-bind:value="draft" x-bind:aria-invalid="showError ? 'true' : null"
                                x-on:input="onHex($event)" x-on:blur="submitDraft()" x-on:keydown.enter.prevent="submitDraft()"
                                class="h-full min-w-0 flex-1 border-0 bg-transparent text-start font-mono text-body-sm text-foreground outline-none pointer-coarse:text-[16px]">
                        </div>
                        <p x-show="showError" style="display: none" role="alert" data-slot="color-picker-error" class="text-caption text-nq-danger-text">{{ $t('Use 3 or 6 hex digits, for example 1A73E8.', 'أدخل 3 أو 6 خانات سداسية، مثل 1A73E8.') }}</p>
                    </div>
                @endif
                @if ($allowNative)
                    <div class="contents">
                        <button type="button" data-slot="color-picker-custom" x-on:click="openNative()"
                            class="inline-flex h-control-sm min-h-[var(--nq-touch-min,0px)] items-center justify-center gap-2 rounded-control border border-border bg-card px-2.5 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4">
                            <x-lucide-pipette aria-hidden="true" />
                            {{ $t('Custom', 'مخصص') }}
                        </button>
                        <input type="color" tabindex="-1" aria-hidden="true" class="sr-only" x-on:change="onNative($event)">
                    </div>
                @endif
            </div>
        </x-nq::popover.content>
    </x-nq::popover>
</div>

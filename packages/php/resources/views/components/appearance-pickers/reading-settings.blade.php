{{-- <x-nq::appearance-pickers.reading-settings :default-value="['fontSize' => 'lg', 'width' => 'normal', 'spacing' => 'normal']" />
     Reading comfort settings: text size, line width and line spacing, with a live sample. It only holds the choice: x-modelable="prefs" (x-model / wire:model),
     and each change dispatches a bubbling "nq-change" event with { fontSize, width, spacing }. Apply it to your reading area with the CSS variables
     --reading-scale, --reading-max-width and --reading-line-height (see nq_appearance_vars(), or read them off the preview's style attribute) and save it as JSON.
     default-value: the starting choice (default md / normal / normal). show-preview: the sample paragraph (default true). preview-title and preview-body replace its text.
     controls: which of fontSize, width, spacing to show (default all). disabled. labels: array overriding the words. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.appearance-pickers._appearance')
@props(['defaultValue' => null, 'showPreview' => true, 'previewTitle' => null, 'previewBody' => null, 'controls' => ['fontSize', 'width', 'spacing'], 'disabled' => false, 'labels' => []])
@php
    $t = nq_appearance_t($labels);
    $p = nq_appearance_parse($defaultValue);
    $isDefault = $p === nq_appearance_defaults();
    $row = 'flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4';
    $rowLabel = 'text-label text-foreground sm:w-32 sm:shrink-0';
    $sizes = ['sm', 'md', 'lg', 'xl'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'reading-settings') }}" x-data="nqReadingSettings(@js($p), @js((bool) $disabled))" x-modelable="prefs" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if (in_array('fontSize', $controls, true))
        <div class="{{ $row }}">
            <div class="{{ $rowLabel }}">{{ $t['fontSize'] }}</div>
            <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                    <x-nq::button variant="secondary" size="icon-sm" :aria-label="$t['smaller']" :disabled="$disabled || $p['fontSize'] === 'sm'" x-bind:disabled="disabled || prefs.fontSize === 'sm'" x-bind:data-disabled="disabled || prefs.fontSize === 'sm' ? '' : undefined" x-on:click="step(-1)">
                        <x-lucide-minus aria-hidden="true" />
                    </x-nq::button>
                    <x-nq::toggle-group :default-value="[$p['fontSize']]" :disabled="$disabled" :aria-label="$t['fontSize']" data-row="fontSize" x-model="fontSizeV">
                        @foreach ($sizes as $size)
                            <x-nq::toggle-group.toggle :value="$size" :aria-label="$t['sizes'][$size]"><span dir="ltr" class="tabular-nums">{{ nq_appearance_percent($size) }}%</span></x-nq::toggle-group.toggle>
                        @endforeach
                    </x-nq::toggle-group>
                    <x-nq::button variant="secondary" size="icon-sm" :aria-label="$t['larger']" :disabled="$disabled || $p['fontSize'] === 'xl'" x-bind:disabled="disabled || prefs.fontSize === 'xl'" x-bind:data-disabled="disabled || prefs.fontSize === 'xl' ? '' : undefined" x-on:click="step(1)">
                        <x-lucide-plus aria-hidden="true" />
                    </x-nq::button>
                </div>
            </div>
        </div>
    @endif
    @if (in_array('width', $controls, true))
        <div class="{{ $row }}">
            <div class="{{ $rowLabel }}">{{ $t['width'] }}</div>
            <div class="min-w-0">
                <x-nq::toggle-group :default-value="[$p['width']]" :disabled="$disabled" :aria-label="$t['width']" data-row="width" x-model="widthV">
                    @foreach (['narrow', 'normal', 'wide', 'full'] as $w)
                        <x-nq::toggle-group.toggle :value="$w">{{ $t['widths'][$w] }}</x-nq::toggle-group.toggle>
                    @endforeach
                </x-nq::toggle-group>
            </div>
        </div>
    @endif
    @if (in_array('spacing', $controls, true))
        <div class="{{ $row }}">
            <div class="{{ $rowLabel }}">{{ $t['spacing'] }}</div>
            <div class="min-w-0">
                <x-nq::toggle-group :default-value="[$p['spacing']]" :disabled="$disabled" :aria-label="$t['spacing']" data-row="spacing" x-model="spacingV">
                    @foreach (['compact', 'normal', 'relaxed'] as $s)
                        <x-nq::toggle-group.toggle :value="$s">{{ $t['spacings'][$s] }}</x-nq::toggle-group.toggle>
                    @endforeach
                </x-nq::toggle-group>
            </div>
        </div>
    @endif
    <div class="flex justify-end">
        <x-nq::button variant="ghost" size="sm" :disabled="$disabled || $isDefault" x-bind:disabled="disabled || isDefault" x-bind:data-disabled="disabled || isDefault ? '' : undefined" x-on:click="reset()">
            <x-lucide-rotate-ccw aria-hidden="true" class="rtl:-scale-x-100" />
            {{ $t['reset'] }}
        </x-nq::button>
    </div>
    @if ($showPreview)
        <section aria-label="{{ $t['preview'] }}" data-slot="reading-preview" class="min-w-0 overflow-hidden rounded-card border border-border bg-card p-4" style="{{ nq_appearance_vars($p) }}" x-bind:style="styleVars">
            <div class="mx-auto" style="max-width: var(--reading-max-width); font-size: calc(1rem * var(--reading-scale)); line-height: var(--reading-line-height)">
                <h3 class="mb-1 font-semibold text-foreground" style="font-size: 1.25em; line-height: 1.3">{{ $previewTitle ?? $t['previewTitle'] }}</h3>
                <p class="text-nq-fg-body">{{ $previewBody ?? $t['previewBody'] }}</p>
            </div>
        </section>
    @endif
</div>

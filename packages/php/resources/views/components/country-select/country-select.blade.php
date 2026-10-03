{{-- <x-nq::country-select name="country" value="SA" aria-label="Country" />
     A searchable country combobox with SVG flags and names in English or Arabic. value is the ISO 3166-1 alpha-2 code ("" for none).
     name adds a hidden input carrying the ISO code. countries: a list of ['iso' => 'SA', 'en' => 'Saudi Arabia', 'ar' => 'السعودية'] (default: every dialling country).
     hub: true (or a base URL string) loads the countries from a CircleXO-style locations API instead (items need an iso2). invalid, disabled, placeholder, locale.
     x-model / wire:model work on the ISO code (x-modelable="iso"); each change dispatches "country-change" ({ value }).
     id, aria-label land on the text input; class lands on the wrapper. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => '', 'name' => null, 'countries' => null, 'hub' => false, 'locale' => null, 'invalid' => false, 'disabled' => false, 'placeholder' => null])
@php
    $locale ??= app()->getLocale();
    $options = array_filter([
        'locale' => str_replace('_', '-', $locale),
        'invalid' => $invalid ?: null,
        'countries' => $countries ? array_values((array) $countries) : null,
        'hub' => $hub ?: null,
    ], fn ($v) => $v !== null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'country-select') }}" x-data="nqCountrySelect(@js(strtoupper((string) $value)), @js($options))" x-modelable="iso"
    {{ $attributes->except(['data-slot', 'id', 'aria-label', 'placeholder'])->cn('contents') }}>
    <div x-data="nqPlaceSelect({ options: () => items(), value: () => code(), set: (v) => pickCountry(v), disabled: () => {{ $disabled ? 'true' : 'false' }}, empty: () => emptyText() })" class="contents">
        <x-nq::combobox.input :id="$attributes->get('id')" :aria-label="$attributes->get('aria-label')" :invalid="(bool) $invalid"
            :placeholder="$placeholder ?? \Nasaq\Nasaq::t('Select a country', 'اختر الدولة')"
            :clear-label="\Nasaq\Nasaq::t('Clear', 'مسح')" :trigger-label="\Nasaq\Nasaq::t('Open', 'فتح')" />
        <x-nq::combobox.content>
            <x-nq::combobox.empty />
            <div data-slot="combobox-list" class="outline-none">
                <template x-if="open"><div class="contents"><template x-for="o in matches()" :key="o.value">
                    <div data-slot="combobox-item" x-bind="item(o)"
                        class="relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50">
                        <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
                            <span x-show="String(cfg.value()) === String(o.value)" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
                        </span>
                        <span data-slot="combobox-item-text" class="min-w-0 flex-1 truncate">
                            <span class="flex items-center gap-2">
                                <span data-slot="country-flag" aria-hidden="true" x-data="nqCountryFlag(o.value)" x-html="svg"
                                    class="relative inline-block aspect-[3/2] h-[1em] shrink-0 overflow-hidden rounded-[2px] bg-muted align-[-0.125em] text-[1rem] [&>svg]:block [&>svg]:size-full after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/15 after:ring-inset"></span>
                                <span class="min-w-0 flex-1 truncate" x-text="o.label"></span>
                            </span>
                        </span>
                    </div>
                </template></div></template>
            </div>
        </x-nq::combobox.content>
    </div>
    @if ($name)
        <input type="hidden" name="{{ $name }}" :value="code()">
    @endif
</div>

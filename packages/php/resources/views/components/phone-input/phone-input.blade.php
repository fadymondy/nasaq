{{-- <x-nq::phone-input name="phone" value="+966501234567" default-country="SA" aria-label="Phone" />
     A phone field: a country picker (flag, dial code, name; Gulf and Arab countries first) and a digits field in one bordered group.
     value is E.164 ("+966501234567", "" when empty); a local number such as 0591234567 is read as the default country's. name adds a hidden input carrying the E.164 value.
     default-country: ISO code used when there is no value (default SA). preferred: ISO codes listed first. invalid, disabled, placeholder.
     Typing groups the digits by the country's rules; pasting "+9665…" picks the country from its calling code.
     x-model / wire:model work on the E.164 value (x-modelable="value"); each change dispatches "phone-change" ({ value, country }).
     id, aria-label and other attributes land on the digits input; class lands on the group. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => '', 'name' => null, 'defaultCountry' => 'SA', 'preferred' => null, 'locale' => null, 'invalid' => false, 'disabled' => false, 'placeholder' => null])
@php
    $locale ??= app()->getLocale();
    $dial = ['SA' => '966', 'AE' => '971', 'EG' => '20', 'KW' => '965', 'QA' => '974', 'BH' => '973', 'OM' => '968', 'JO' => '962'][strtoupper($defaultCountry)] ?? '';
    $options = array_filter([
        'defaultCountry' => strtoupper($defaultCountry),
        'preferred' => $preferred ? array_values(array_map('strtoupper', (array) $preferred)) : null,
        'locale' => str_replace('_', '-', $locale),
        'invalid' => $invalid ?: null,
    ], fn ($v) => $v !== null);
    $inner = $attributes->except(['class', 'x-model', 'x-on:phone-change', '@phone-change']);
@endphp
<div data-slot="phone-input-root" x-data="nqPhoneInput(@js($value), @js($options))" x-modelable="value" x-id="['nq-phone']"
    {{ $attributes->only(['x-model', 'x-on:phone-change', '@phone-change'])->cn('block w-full min-w-0') }}>
    <div role="group" data-slot="phone-input" x-ref="anchor" @if ($invalid) data-invalid @endif
        class="{{ \Nasaq\Cn::merge('group/input-group flex h-control min-h-[var(--nq-touch-min,0px)] w-full min-w-0 items-center overflow-hidden rounded-control border border-input bg-card text-body text-foreground transition-colors duration-150 ease-nq focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50', $attributes->get('class', '')) }}">
        <button data-slot="phone-input-country" x-ref="trigger" x-bind="trigger" @disabled($disabled)
            class="{{ \Nasaq\Cn::merge('order-first flex h-full shrink-0 cursor-default items-center gap-1.5 border-e border-input ps-3 pe-2 text-body-sm text-foreground outline-none', 'transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:bg-nq-hover data-[state=open]:bg-nq-hover', 'disabled:cursor-not-allowed') }}">
            <span data-slot="country-flag" aria-hidden="true" x-html="flag"
                class="relative inline-block aspect-[3/2] h-[1em] shrink-0 overflow-hidden rounded-[2px] bg-muted align-[-0.125em] text-[1.125rem] [&>svg]:block [&>svg]:size-full after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/15 after:ring-inset"></span>
            <bdi dir="ltr" class="tabular-nums" x-text="'+' + country().dial">+{{ $dial }}</bdi>
            <x-lucide-chevrons-up-down aria-hidden="true" class="size-3.5 text-muted-foreground" />
        </button>
        <input data-slot="input-group-input" dir="ltr" x-bind="field" @disabled($disabled) @if ($placeholder) placeholder="{{ $placeholder }}" @endif
            {{ $inner->cn('h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-body text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed pointer-coarse:text-[16px] text-start tabular-nums') }}>
        @if ($name)
            <input type="hidden" name="{{ $name }}" :value="value">
        @endif
    </div>
    <template x-teleport="body">
        <div data-slot="phone-input-content" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.anchor" :dir="lang === 'ar' ? 'rtl' : 'ltr'"
            class="z-50 w-[max(var(--anchor-width),18rem)] overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
            <div class="border-b border-border p-1.5">
                <input data-slot="phone-input-search" x-ref="search" x-bind="search"
                    class="h-control-sm w-full min-w-0 rounded-control border-0 bg-transparent px-2 text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]">
            </div>
            <div class="max-h-64 overflow-y-auto p-1.5">
                <template x-if="open"><div class="contents"><template x-for="c in matches()" :key="c.iso">
                    <div data-slot="combobox-item" x-bind="item(c)"
                        class="relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected">
                        <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
                            <span x-show="c.iso === iso" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
                        </span>
                        <span class="flex min-w-0 flex-1 items-center gap-2">
                            <span data-slot="country-flag" aria-hidden="true" x-data="nqCountryFlag(c.iso)" x-html="svg"
                                class="relative inline-block aspect-[3/2] h-[1em] shrink-0 overflow-hidden rounded-[2px] bg-muted align-[-0.125em] text-[1rem] [&>svg]:block [&>svg]:size-full after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/15 after:ring-inset"></span>
                            <span class="min-w-0 flex-1 truncate" x-text="c.label"></span>
                            <bdi dir="ltr" class="shrink-0 text-muted-foreground tabular-nums" x-text="'+' + c.dial"></bdi>
                        </span>
                    </div>
                </template></div></template>
                <div x-bind="emptyState" class="px-2.5 py-2 text-body-sm text-muted-foreground">{{ \Nasaq\Nasaq::t('No country found.', 'لا توجد دولة مطابقة.') }}</div>
            </div>
        </div>
    </template>
</div>

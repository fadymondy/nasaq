{{-- <x-nq::switchers.locale-switcher show-label />   A language dropdown; switching to Arabic flips the page to RTL.
     show-label: the current language name beside the icon. label: the menu heading. locales: [['value'=>'en','label'=>'English','dir'=>'ltr'], ...] (default English and Arabic).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['showLabel' => false, 'label' => null, 'locales' => [['value' => 'en', 'label' => 'English', 'dir' => 'ltr'], ['value' => 'ar', 'label' => 'العربية', 'dir' => 'rtl']]])
@php
    $title = $label ?? \Nasaq\Nasaq::t('Language', 'اللغة');
    $names = collect($locales)->pluck('label', 'value')->all();
    $ariaBind = $showLabel ? null : '`'.str_replace(['`', '${', chr(92)], '', $title).': ` + name';
    $current = $names[\Nasaq\Nasaq::rtl() ? 'ar' : 'en'] ?? reset($names);
@endphp
<div x-data="nqLocalePref(@js($names))" class="contents">
    <x-nq::dropdown-menu>
        <x-nq::dropdown-menu.trigger variant="ghost" :size="$showLabel ? 'sm' : 'icon-sm'" {{ $attributes->cn('text-muted-foreground') }}
            :x-bind:aria-label="$showLabel ? null : '@js(\''.$title.'\')'">
            <x-nq::icon name="languages" />
            @if ($showLabel)<span x-text="name" x-bind:lang="locale">{{ $current }}</span>@endif
        </x-nq::dropdown-menu.trigger>
        <x-nq::dropdown-menu.content align="end" class="min-w-40">
            <x-nq::dropdown-menu.group><x-nq::dropdown-menu.label>{{ $title }}</x-nq::dropdown-menu.label></x-nq::dropdown-menu.group>
            <x-nq::switchers.locale-menu-items :locales="$locales" />
        </x-nq::dropdown-menu.content>
    </x-nq::dropdown-menu>
</div>

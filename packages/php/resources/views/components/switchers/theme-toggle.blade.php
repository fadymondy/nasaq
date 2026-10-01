{{-- <x-nq::switchers.theme-toggle />   One icon button that flips light and dark; the sun and moon cross-fade. It sets an explicit theme, so the first click leaves "system".
     Needs the Alpine runtime (@nasaqScripts). The click sound of the React component is not ported. --}}
@php
    $toDark = \Nasaq\Nasaq::t('Switch to dark theme', 'التبديل إلى المظهر الداكن');
    $toLight = \Nasaq\Nasaq::t('Switch to light theme', 'التبديل إلى المظهر الفاتح');
    $ariaBind = 'dark ? `'.str_replace(['`', '${', chr(92)], '', $toLight).'` : `'.str_replace(['`', '${', chr(92)], '', $toDark).'`';
    $glyph = 'absolute inset-0 m-auto transition-[opacity,rotate,scale] duration-300 ease-nq motion-reduce:transition-none';
@endphp
<div x-data="nqThemePref()" class="contents">
    <x-nq::tooltip>
        <x-slot:tip><span x-text="dark ? @js($toLight) : @js($toDark)">{{ $toDark }}</span></x-slot:tip>
        <x-nq::button variant="ghost" size="icon-sm" data-slot="theme-toggle" x-on:click="toggle()"
            x-bind:data-state="dark ? 'dark' : 'light'" :x-bind:aria-label="$ariaBind" aria-label="{{ $toDark }}"
            {{ $attributes->cn('relative overflow-hidden text-muted-foreground hover:text-foreground') }}>
            <x-nq::icon name="sun" class="{{ $glyph }}" x-bind:class="dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'" />
            <x-nq::icon name="moon" class="{{ $glyph }}" x-bind:class="dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'" />
        </x-nq::button>
    </x-nq::tooltip>
</div>

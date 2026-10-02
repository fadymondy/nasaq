{{-- <x-nq::switchers.theme-switcher />   Segmented Light / Dark / System control. Arrow keys move between options; the choice is saved and applied to <html>.
     Needs the Alpine runtime (@nasaqScripts). --}}
@php
    $labels = \Nasaq\Nasaq::rtl()
        ? ['group' => 'المظهر', 'light' => 'فاتح', 'dark' => 'داكن', 'system' => 'النظام']
        : ['group' => 'Theme', 'light' => 'Light', 'dark' => 'Dark', 'system' => 'System'];
    $options = ['light' => 'sun', 'dark' => 'moon', 'system' => 'monitor'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'theme-switcher') }}" role="group" aria-label="{{ $labels['group'] }}" x-data="nqThemePref()" x-on:keydown="onKey($event)"
    {{ $attributes->except('data-slot')->cn('inline-flex h-control-sm items-center gap-px rounded-control border border-border bg-card p-0.5') }}>
    @foreach ($options as $value => $icon)
        <x-nq::tooltip :content="$labels[$value]">
            <button type="button" aria-label="{{ $labels[$value] }}" x-on:click="set('{{ $value }}')"
                x-bind:aria-pressed="pref === '{{ $value }}' ? 'true' : 'false'" x-bind:data-pressed="pref === '{{ $value }}' ? '' : undefined"
                class="inline-flex h-full aspect-square items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus data-pressed:bg-nq-selected data-pressed:text-foreground [&_svg]:size-3.5">
                <x-nq::icon :name="$icon" />
            </button>
        </x-nq::tooltip>
    @endforeach
</div>

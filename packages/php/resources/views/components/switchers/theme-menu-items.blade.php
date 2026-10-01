{{-- <x-nq::switchers.theme-menu-items />   Light / Dark / System radio items for a dropdown-menu, for example the user menu.
     Wrap the menu in x-data="nqThemePref()" (the items bind its pref). --}}
@php
    $labels = \Nasaq\Nasaq::rtl() ? ['light' => 'فاتح', 'dark' => 'داكن', 'system' => 'النظام'] : ['light' => 'Light', 'dark' => 'Dark', 'system' => 'System'];
    $options = ['light' => 'sun', 'dark' => 'moon', 'system' => 'monitor'];
@endphp
<x-nq::dropdown-menu.radio-group x-model="pref">
    @foreach ($options as $value => $icon)
        <x-nq::dropdown-menu.radio-item :value="$value"><x-nq::icon :name="$icon" /> {{ $labels[$value] }}</x-nq::dropdown-menu.radio-item>
    @endforeach
</x-nq::dropdown-menu.radio-group>

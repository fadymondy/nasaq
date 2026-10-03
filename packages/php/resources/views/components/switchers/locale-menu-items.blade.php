{{-- <x-nq::switchers.locale-menu-items />   Locale radio items for a dropdown-menu that sits inside x-data="nqLocalePref()" (locale-switcher does this).
     Each language shows in its own script. locales: [['value','label','dir']]. --}}
@props(['locales' => [['value' => 'en', 'label' => 'English', 'dir' => 'ltr'], ['value' => 'ar', 'label' => 'العربية', 'dir' => 'rtl']]])
<x-nq::dropdown-menu.radio-group x-model="locale">
    @foreach ($locales as $option)
        <x-nq::dropdown-menu.radio-item :value="$option['value']"><span lang="{{ $option['value'] }}" dir="{{ $option['dir'] ?? 'ltr' }}">{{ $option['label'] }}</span></x-nq::dropdown-menu.radio-item>
    @endforeach
</x-nq::dropdown-menu.radio-group>

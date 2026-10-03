{{-- <x-nq::translations.text key="cart.items" :vars="['count' => 3]" />
     One app string inside <x-nq::translations.provider>: translated on the server for the app locale, and re-translated by Alpine when the locale changes.
     key: the dictionary key. vars: interpolation values; a numeric `count` also picks the plural form; `defaultValue` is shown for a missing key. --}}
@include('nasaq::components.translations._translations')
@aware(['messages' => [], 'fallbackLocale' => 'en'])
@props(['key', 'vars' => []])
<span data-slot="{{ $attributes->get('data-slot', 'translations-text') }}" x-text="t(@js($key), @js($vars))" {{ $attributes->except("data-slot") }}>{{ nq_translate($messages, app()->getLocale(), $key, $vars, $fallbackLocale) }}</span>

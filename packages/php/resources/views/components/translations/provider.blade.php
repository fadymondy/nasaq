{{-- <x-nq::translations.provider :messages="['en' => ['hello' => 'Hello {name}'], 'ar' => ['hello' => 'مرحبا {name}']]"> <x-nq::translations.text key="hello" :vars="['name' => 'Sara']" /> </x-nq::translations.provider>
     App strings for the Nasaq locale (port of the React TranslationsProvider; it renders only a `contents` wrapper). The parts below read the
     dictionaries on the server for the app locale, and the Alpine module nqTranslations keeps them in step when the locale changes in the browser.
     messages: locale => dictionary (nested arrays, `ns:key`, `_zero|_one|_two|_few|_many|_other` plural keys).
     fallback-locale: searched when a key is missing (default "en"). storage-key: where the choice is remembered (default "nasaq-locale", null = off).
     In Alpine, children read `t(key, vars)`, `locale`, `setLocale(l)`, `seedLocale(l)` and `hasStoredLocale()` through the scope. --}}
@props(['messages' => [], 'fallbackLocale' => 'en', 'storageKey' => 'nasaq-locale'])
<div data-slot="{{ $attributes->get('data-slot', 'translations-provider') }}" x-data="nqTranslations(@js($messages), @js(['fallbackLocale' => $fallbackLocale, 'storageKey' => $storageKey]))" {{ $attributes->except('data-slot')->cn('contents') }}>{{ $slot }}</div>

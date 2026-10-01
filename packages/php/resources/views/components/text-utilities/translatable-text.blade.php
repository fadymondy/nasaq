{{-- <x-nq::text-utilities.translatable-text original="مرحبًا بك في الفريق" source-lang="ar" fetch @translate="$event.detail.wait(translate($event.detail.text, $event.detail.target))" />
     A message with a toggle between the original and its translation. Each version carries its own lang and direction; a fetched translation is kept.
     original and source-lang are required. translation: one you already have. fetch: no translation yet, so the first toggle fires "translate" with
     { text, target, wait(promise) }: resolve with the text, or { error: 'message' } (or reject) to show the failure with a retry.
     target-lang defaults to the current locale. show-translation starts on the translation. lines clamps both versions.
     linkify is not offered here (the swap is done in the browser): wrap the text in <x-nq::text-utilities.user-text linkify> instead.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['original', 'sourceLang', 'translation' => null, 'fetch' => false, 'targetLang' => null, 'showTranslation' => false, 'lines' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $target = $targetLang ?? app()->getLocale();
    $canToggle = $translation !== null || $fetch;
    $showing = $showTranslation && $translation !== null;
    $init = ['original' => $original, 'translation' => $translation, 'source' => $sourceLang, 'target' => $target, 'show' => $showing, 'fetch' => (bool) $fetch];
    $language = fn (string $code) => class_exists(\Locale::class) ? (\Locale::getDisplayLanguage($code, app()->getLocale()) ?: $code) : $code;
    $clamp = $lines ? "display: -webkit-box; -webkit-line-clamp: {$lines}; -webkit-box-orient: vertical" : null;
@endphp
<div data-slot="translatable-text" data-showing="{{ $showing ? 'translation' : 'original' }}" x-data="nqTranslatable(@js($init))" x-bind="root" {{ $attributes->cn('flex min-w-0 flex-col gap-1.5') }}>
    <p data-slot="user-text" dir="auto" lang="{{ $showing ? $target : $sourceLang }}" x-bind="body" @if ($clamp) style="{{ $clamp }}" @endif
        class="block min-w-0 text-start [unicode-bidi:plaintext] text-body text-foreground {{ $lines ? 'overflow-hidden break-words' : '' }}">{{ $showing ? $translation : $original }}</p>
    @if ($canToggle)
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            <button type="button" x-bind="toggleButton" aria-pressed="{{ $showing ? 'true' : 'false' }}"
                class="inline-flex items-center gap-1.5 rounded-control text-muted-foreground underline decoration-nq-line underline-offset-4 outline-none hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-60">
                <x-nq::spinner x-show="pending" x-cloak style="display: none" class="size-3" />
                <x-lucide-languages x-show="!pending" aria-hidden="true" class="size-3.5" />
                <span x-text="toggleText">{{ $showing ? $t::t('Show original', 'عرض الأصل') : $t::t('Show translation', 'عرض الترجمة') }}</span>
            </button>
            <span x-text="note">{{ $showing ? $t::t('Translated from ', 'مترجم من ').$language($sourceLang) : $t::t('Original in ', 'الأصل بـ').$language($sourceLang) }}</span>
        </div>
    @endif
    <p role="alert" x-show="error" x-cloak style="display: none" class="flex flex-wrap items-center gap-2 text-caption text-nq-danger-text">
        <span x-text="error"></span>
        <button type="button" x-on:click="load()" class="inline-flex items-center gap-1 underline underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
            <x-lucide-rotate-ccw aria-hidden="true" class="size-3" />
            {{ $t::t('Try again', 'حاول مرة أخرى') }}
        </button>
    </p>
</div>

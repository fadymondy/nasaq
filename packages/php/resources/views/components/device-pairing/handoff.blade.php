{{-- <x-nq::device-pairing.handoff app-name="Mahaam Desktop" href="mahaam://auth/callback?token=abc" state="opening" fallback-code="WDJBMJHT" cancel />
     The page a browser shows after sign-in to hand the session to a native app (the React DeviceHandoff): an "Open the app" link to the deep
     link, a state line, a browser fallback and a typed-code fallback. It never navigates on its own. No script of its own; the card is plain
     HTML (the copy button needs the Alpine runtime). Plain events: nq-device-open (from the link, which still follows href) and nq-device-cancel.
     app-name, href (the deep link), state: opening (default) | opened | failed. browser-href: "Continue in the browser instead".
     fallback-code: a code to type into the app. cancel: shows "Cancel sign-in". Slot mark: the app's mark (default: the product mark). labels: override any string. --}}
@props(['appName', 'href', 'state' => 'opening', 'browserHref' => null, 'fallbackCode' => null, 'cancel' => false, 'mark' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'title' => $t::t('Open {app}', 'افتح {app}'),
        'opening' => $t::t('Opening {app}. If your browser asks, allow it to open the app.', 'جارٍ فتح {app}. إذا سأل المتصفح فاسمح له بفتح التطبيق.'),
        'opened' => $t::t('{app} should be open now. You can close this tab.', 'يجب أن يكون {app} مفتوحًا الآن. يمكنك إغلاق هذا التبويب.'),
        'failed' => $t::t('We could not open {app}. Make sure it is installed, then try again.', 'تعذّر فتح {app}. تأكد من أنه مثبّت ثم حاول مرة أخرى.'),
        'open' => $t::t('Open {app}', 'افتح {app}'),
        'again' => $t::t('Try again', 'حاول مرة أخرى'),
        'browser' => $t::t('Continue in the browser instead', 'المتابعة في المتصفح بدلًا من ذلك'),
        'code' => $t::t('Or type this code in the app', 'أو اكتب هذا الرمز في التطبيق'),
        'cancel' => $t::t('Cancel sign-in', 'إلغاء تسجيل الدخول'),
    ], (array) $labels);
    $state = in_array($state, ['opening', 'opened', 'failed'], true) ? $state : 'opening';
    $fill = fn (string $text): string => str_replace('{app}', $appName, $text);
    $grouped = $fallbackCode ? implode('-', str_split(preg_replace('/[^A-Z0-9]/', '', strtoupper((string) $fallbackCode)), 4)) : '';
@endphp
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'device-handoff') }}" x-data data-state="{{ $state }}" {{ $attributes->except('data-slot')->cn('mx-auto w-full max-w-md items-center gap-5 p-8 text-center') }}>
    <div class="flex items-center gap-3 text-muted-foreground" aria-hidden="true">
        <x-lucide-laptop class="size-5" />
        <span class="h-px w-8 bg-border"></span>
        <x-lucide-smartphone class="size-5" />
    </div>
    <div data-slot="device-handoff-mark">@if ($mark && ! $mark->isEmpty()){{ $mark }}@else<x-nq::product-mark :size="44" title="" />@endif</div>
    <h1 class="text-h2 text-foreground">{{ $fill($l['title']) }}</h1>
    <div role="{{ $state === 'failed' ? 'alert' : 'status' }}" class="flex items-center gap-2 text-body-sm text-muted-foreground">
        @if ($state === 'opening')<x-nq::spinner />@endif
        <p>{{ $fill($l[$state]) }}</p>
    </div>
    <x-nq::button variant="primary" size="lg" href="{{ $href }}" x-on:click="$dispatch('nq-device-open')" class="w-full sm:w-auto">
        <x-lucide-external-link aria-hidden="true" class="rtl:-scale-x-100" />
        {{ $fill($state === 'failed' || $state === 'opened' ? $l['again'] : $l['open']) }}
    </x-nq::button>
    @if ($browserHref)
        <a href="{{ $browserHref }}" class="text-body-sm text-foreground underline underline-offset-4">{{ $l['browser'] }}</a>
    @endif
    @if ($grouped)
        <div class="flex w-full flex-col items-center gap-1.5 border-t border-border pt-4">
            <span class="text-caption text-muted-foreground">{{ $l['code'] }}</span>
            <span class="inline-flex items-center gap-1">
                <span dir="ltr" class="font-mono text-h3 tracking-[0.12em] text-foreground">{{ $grouped }}</span>
                <x-nq::copy-button :value="$grouped" />
            </span>
        </div>
    @endif
    @if ($cancel)
        <x-nq::button variant="link" size="sm" x-on:click="$dispatch('nq-device-cancel')">{{ $l['cancel'] }}</x-nq::button>
    @endif
</x-nq::card>

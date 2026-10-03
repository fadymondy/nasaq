{{-- <x-nq::extension-popup.connect mode="server" default-server="https://app.example.com" />
     The first-run form. mode: server (type the server address, then sign in) | pair (type the 6-character code the app shows). The address or code is left-to-right in Arabic.
     Submitting a valid value dispatches a bubbling "nq-connect" event with detail { server, code, wait(promise) }; hand wait() a promise that resolves
     to nothing or { error } and the button shows busy until it settles, and the error shows as an alert under the form. labels: override any string.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['mode' => 'server', 'defaultServer' => '', 'labels' => []])
@php
    use Nasaq\Nasaq;

    $pair = $mode === 'pair';
    $t = array_merge([
        'connectTitle' => Nasaq::t('Connect to your workspace', 'الاتصال بمساحة عملك'),
        'connectHint' => Nasaq::t('Enter your server address, then sign in. The extension never asks for a password itself.', 'أدخل عنوان الخادم ثم سجّل الدخول. الإضافة لا تطلب كلمة المرور بنفسها.'),
        'serverLabel' => Nasaq::t('Server address', 'عنوان الخادم'),
        'serverPlaceholder' => 'https://app.example.com',
        'connect' => Nasaq::t('Connect', 'اتصال'),
        'pairTitle' => Nasaq::t('Pair with your account', 'الاقتران بحسابك'),
        'pairHint' => Nasaq::t('Open Settings, Extensions in the app and type the pairing code it shows.', 'افتح الإعدادات ثم الإضافات في التطبيق واكتب رمز الاقتران الظاهر.'),
        'codeLabel' => Nasaq::t('Pairing code', 'رمز الاقتران'),
        'pair' => Nasaq::t('Pair', 'اقتران'),
        'invalidServer' => Nasaq::t('Enter a full address, starting with https://', 'أدخل عنوانًا كاملًا يبدأ بـ https://'),
        'invalidCode' => Nasaq::t('The code has 6 characters', 'الرمز من 6 خانات'),
    ], (array) $labels);
    $config = ['mode' => $pair ? 'pair' : 'server', 'server' => $defaultServer, 'invalidServer' => $t['invalidServer'], 'invalidCode' => $t['invalidCode']];
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'extension-connect') }}" novalidate x-data="nqExtensionConnect(@js($config))" x-on:submit.prevent="submit()" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <div class="flex flex-col gap-1">
        <h2 class="flex items-center gap-2 text-h3 text-foreground">
            <span aria-hidden="true" class="text-muted-foreground [&_svg]:size-4"><x-lucide-link-2 /></span>
            {{ $pair ? $t['pairTitle'] : $t['connectTitle'] }}
        </h2>
        <p class="text-caption text-muted-foreground">{{ $pair ? $t['pairHint'] : $t['connectHint'] }}</p>
    </div>
    <x-nq::field>
        @if ($pair)
            <x-nq::field.label>{{ $t['codeLabel'] }}</x-nq::field.label>
            <x-nq::field.input ltr maxlength="6" autocomplete="one-time-code" inputmode="text" x-bind:value="code" x-on:input="code = $event.target.value.toUpperCase(); $event.target.value = code" class="font-mono tracking-[0.3em] uppercase" />
        @else
            <x-nq::field.label>{{ $t['serverLabel'] }}</x-nq::field.label>
            <x-nq::field.input ltr type="url" placeholder="{{ $t['serverPlaceholder'] }}" value="{{ $defaultServer }}" x-model="server" />
        @endif
    </x-nq::field>
    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : undefined" x-bind:disabled="busy">
        <span x-show="busy" x-cloak style="display: none"><x-nq::spinner /></span>
        {{ $pair ? $t['pair'] : $t['connect'] }}
    </x-nq::button>
    <p x-show="error" x-cloak style="display: none" role="alert" class="flex items-start gap-1.5 text-caption text-nq-danger-text">
        <span aria-hidden="true" class="mt-0.5 shrink-0 [&_svg]:size-3.5"><x-lucide-circle-alert /></span>
        <span x-text="error"></span>
    </p>
</form>

{{-- <x-nq::two-factor-challenge x-on:nq-two-factor="$event.detail.waitUntil(check($event.detail))"><x-slot:footer><a href="/login">Back to sign in</a></x-slot:footer></x-nq::two-factor-challenge>
     The second step of sign-in: an authenticator code (submits on the last digit), a switch to a one-time recovery code, a "trust this device"
     checkbox and an optional passkey alternative.
     Events (bubble from the form; detail.waitUntil(promise); resolve nothing for success or { error } for a wrong code, the input then clears and refocuses):
     nq-two-factor { code, method, trustDevice }, nq-two-factor-passkey {}. With no nq-two-factor listener and an action attribute it submits natively
     (fields code, method, trustDevice).
     default-method: totp | recovery. show-trust-device: default true. length: default 6. passkey: the passkey button (shown when the browser supports
     WebAuthn). labels: override any string. Slot footer: under the actions. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['defaultMethod' => 'totp', 'showTrustDevice' => true, 'length' => 6, 'passkey' => false, 'footer' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'totpDescription' => $t::t('Open your authenticator app and enter the {length}-digit code.', 'افتح تطبيق المصادقة وأدخل الرمز المكوّن من {length} أرقام.'),
        'recoveryDescription' => $t::t('Enter one of the recovery codes you saved when you turned on two-step verification. Each code works once.', 'أدخل أحد رموز الاسترداد التي حفظتها عند تفعيل التحقق بخطوتين. كل رمز يعمل مرة واحدة.'),
        'totpGroup' => $t::t('Authenticator code', 'رمز تطبيق المصادقة'),
        'recoveryLabel' => $t::t('Recovery code', 'رمز الاسترداد'),
        'recoveryPlaceholder' => 'xxxx-xxxx',
        'trust' => $t::t('Trust this device for 30 days', 'الوثوق بهذا الجهاز لمدة 30 يومًا'),
        'submit' => $t::t('Verify', 'تحقّق'),
        'useRecovery' => $t::t('Use a recovery code instead', 'استخدم رمز استرداد بدلًا من ذلك'),
        'useTotp' => $t::t('Use your authenticator app instead', 'استخدم تطبيق المصادقة بدلًا من ذلك'),
        'usePasskey' => $t::t('Use a passkey instead', 'استخدم مفتاح مرور بدلًا من ذلك'),
        'incomplete' => $t::t('Enter all {length} digits.', 'أدخل الأرقام الـ {length} كاملة.'),
        'recoveryRequired' => $t::t('Enter a recovery code.', 'أدخل رمز استرداد.'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $uid = 'nq-2fa-'.\Illuminate\Support\Str::random(6);
    $config = [
        'length' => (int) $length, 'defaultMethod' => $defaultMethod === 'recovery' ? 'recovery' : 'totp', 'passkey' => (bool) $passkey,
        'names' => ['code'], 'failed' => $l['failed'], 'labels' => $l,
    ];
    $action = $attributes->get('action');
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'two-factor-challenge') }}" novalidate x-data="nqTwoFactorChallenge(@js($config))" x-bind:data-method="method"
    data-method="{{ $config['defaultMethod'] }}" x-bind:aria-busy="pending ? 'true' : null" x-effect="inv = Boolean(message())" x-on:submit.prevent="onSubmit()"
    @if ($action) action="{{ $action }}" method="{{ $attributes->get('method', 'post') }}" @endif {{ $attributes->except(['data-slot', 'action', 'method'])->cn('flex w-full flex-col gap-4') }}>
    <p class="text-body-sm text-muted-foreground" x-text="method === 'totp' ? @js(str_replace('{length}', (string) $length, $l['totpDescription'])) : @js($l['recoveryDescription'])">{{ $config['defaultMethod'] === 'totp' ? str_replace('{length}', (string) $length, $l['totpDescription']) : $l['recoveryDescription'] }}</p>
    <input type="hidden" name="method" x-bind:value="method" value="{{ $config['defaultMethod'] }}" />
    <template x-if="method === 'totp'">
        <div class="flex flex-col gap-2" x-effect="markInvalid($el)">
            <x-nq::otp-input name="code" :length="$length" autofocus aria-label="{{ $l['totpGroup'] }}" aria-describedby="{{ $uid }}-message" x-model="code"
                x-on:complete="onComplete($event.detail)" class="self-center" />
            <p id="{{ $uid }}-message" role="alert" class="text-center text-caption text-nq-danger-text" style="display: none" x-show="message()" x-text="message()"></p>
        </div>
    </template>
    <template x-if="method === 'recovery'">
        <x-nq::field name="code" x-model="inv">
            <x-nq::field.label for="{{ $uid }}-code">{{ $l['recoveryLabel'] }}</x-nq::field.label>
            <x-nq::field.input id="{{ $uid }}-code" ltr autofocus autocomplete="off" autocapitalize="none" spellcheck="false" class="font-mono"
                placeholder="{{ $l['recoveryPlaceholder'] }}" aria-describedby="{{ $uid }}-code-error" x-model="code" x-bind:aria-invalid="inv ? 'true' : null" />
            <x-nq::field.error id="{{ $uid }}-code-error"><span x-text="message()"></span></x-nq::field.error>
        </x-nq::field>
    </template>
    @if ($showTrustDevice)
        <label class="flex items-center gap-2 text-body-sm text-foreground">
            <x-nq::checkbox name="trustDevice" value="1" x-model="trust" />
            {{ $l['trust'] }}
        </label>
    @endif
    <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending || passkeyPending" x-bind:data-disabled="pending || passkeyPending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
        <template x-if="pending"><x-nq::spinner /></template>
        {{ $l['submit'] }}
    </x-nq::button>
    <div class="flex flex-col items-center gap-1">
        <x-nq::button type="button" variant="link" size="sm" x-on:click="switchMethod()" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null">
            <span x-text="method === 'totp' ? @js($l['useRecovery']) : @js($l['useTotp'])">{{ $config['defaultMethod'] === 'totp' ? $l['useRecovery'] : $l['useTotp'] }}</span>
        </x-nq::button>
        @if ($passkey)
            <x-nq::button type="button" variant="link" size="sm" data-slot="two-factor-passkey" x-show="passkeyOn" style="display: none" x-on:click="passkey()"
                x-bind:disabled="pending || passkeyPending" x-bind:data-disabled="pending || passkeyPending ? '' : null" x-bind:aria-busy="passkeyPending ? 'true' : null">
                <template x-if="passkeyPending"><x-nq::spinner /></template>
                <x-lucide-key-round aria-hidden="true" />
                {{ $l['usePasskey'] }}
            </x-nq::button>
        @endif
    </div>
    @if ($footer && ! $footer->isEmpty())
        <div class="text-center text-body-sm">{{ $footer }}</div>
    @endif
</form>

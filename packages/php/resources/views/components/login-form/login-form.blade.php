{{-- <x-nq::login-form action="/login" :oauth-providers="['google', 'github']" x-on:nq-login="$event.detail.waitUntil(signIn($event.detail))">
         <x-slot:forgot-password><a href="/forgot-password">Forgot password?</a></x-slot:forgot-password>
     </x-nq::login-form>
     Email sign-in with a password, a magic link or both, plus remember me, a forgot-password slot, an optional passkey button, provider
     buttons and a dev-only shortcut. It validates the shape (email required and valid, password required), then hands the values to you.
     Events (bubble from the form, each with detail.waitUntil(promise); resolve nothing for success or { error, fieldErrors } to show a failure,
     a rejection shows "Something went wrong"): nq-login { email, password, remember }, nq-magic-link { email } (also the resend),
     nq-passkey, nq-passkey-autofill { signal }, nq-dev-login, and nq-oauth-select { id, wait } from the provider buttons.
     With no nq-login listener and an action attribute it submits natively (fields email, password, remember).
     methods: ['password', 'magic-link'] (default ['password']; magic-link on its own drops the password; [] shows the "not available" notice).
     magic-link-seconds: before the link can be sent again (default 30). show-remember: default true. default-email. passkey: the passkey button
     (shown when the browser supports WebAuthn). passkey-autofill: autocomplete="username webauthn" and the nq-passkey-autofill event.
     oauth-providers: see <x-nq::oauth-buttons>. dev-login: the dev-only button (never in production). labels: override any string.
     Slot forgot-password sits beside the password label. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['defaultEmail' => '', 'showRemember' => true, 'oauthProviders' => [], 'passkey' => false, 'passkeyAutofill' => false, 'methods' => ['password'], 'magicLinkSeconds' => 30, 'devLogin' => false, 'forgotPassword' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'email' => $t::t('Email', 'البريد الإلكتروني'),
        'emailPlaceholder' => 'you@example.com',
        'password' => $t::t('Password', 'كلمة المرور'),
        'remember' => $t::t('Remember me', 'تذكّرني'),
        'submit' => $t::t('Sign in', 'تسجيل الدخول'),
        'passkey' => $t::t('Sign in with a passkey', 'تسجيل الدخول بمفتاح المرور'),
        'divider' => $t::t('or', 'أو'),
        'emailRequired' => $t::t('Enter your email address.', 'أدخل بريدك الإلكتروني.'),
        'emailInvalid' => $t::t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.'),
        'passwordRequired' => $t::t('Enter your password.', 'أدخل كلمة المرور.'),
        'errorTitle' => $t::t('Fix these to sign in', 'صحّح ما يلي لتسجيل الدخول'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'magicLink' => $t::t('Email me a sign-in link', 'أرسل لي رابط تسجيل الدخول'),
        'sentTitle' => $t::t('Check your email', 'تحقّق من بريدك'),
        'sentBody' => $t::t('We sent a sign-in link to {email}. It works once and expires soon.', 'أرسلنا رابط تسجيل الدخول إلى {email}. يعمل مرة واحدة وتنتهي صلاحيته قريبًا.'),
        'resend' => $t::t('Send the link again', 'أرسل الرابط مرة أخرى'),
        'resendIn' => $t::t('Send again in {time}', 'أعد الإرسال بعد {time}'),
        'resent' => $t::t('We sent a new link.', 'أرسلنا رابطًا جديدًا.'),
        'changeEmail' => $t::t('Use a different email', 'استخدم بريدًا آخر'),
        'devLogin' => $t::t('Dev login', 'دخول المطوّر'),
        'devFailed' => $t::t('Dev login failed.', 'فشل دخول المطوّر.'),
        'blockedTitle' => $t::t('Sign-in is not available', 'تسجيل الدخول غير متاح'),
        'blockedBody' => $t::t("This account can't sign in here. Contact your administrator.", 'لا يمكن لهذا الحساب تسجيل الدخول هنا. تواصل مع المسؤول.'),
    ], (array) $labels);
    $methods = (array) $methods;
    $withPassword = in_array('password', $methods, true);
    $withMagic = in_array('magic-link', $methods, true);
    $blocked = ! $withPassword && ! $withMagic;
    $magicPrimary = $withMagic && ! $withPassword;
    $uid = 'nq-login-'.\Illuminate\Support\Str::random(6);
    $config = [
        'password' => $withPassword, 'magicLink' => $withMagic, 'magicLinkSeconds' => (int) $magicLinkSeconds,
        'oauth' => count($oauthProviders) > 0, 'passkey' => (bool) $passkey && ! $blocked, 'passkeyAutofill' => (bool) $passkeyAutofill,
        'names' => ['email', 'password'], 'fieldLabels' => ['email' => $l['email'], 'password' => $l['password']],
        'errorTitle' => $l['errorTitle'], 'failed' => $l['failed'], 'labels' => $l,
    ];
    [$before, $after] = array_pad(explode('{email}', $l['sentBody'], 2), 2, '');
    $divide = ($passkey && ! $blocked) || count($oauthProviders);
    $primaryIntent = $magicPrimary ? 'magic-link' : 'password';
@endphp
@if ($blocked)
    <div data-slot="login-form" data-state="blocked" x-data="nqLoginForm(@js($config))" {{ $attributes->cn('flex w-full flex-col gap-4') }}>
        <x-nq::alert tone="warning" :title="$l['blockedTitle']">{{ $l['blockedBody'] }}</x-nq::alert>
        <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
        @if ($devLogin)
            <x-nq::button type="button" variant="ghost" size="lg" data-slot="login-form-dev" x-on:click="devLogin()" x-bind:disabled="devPending" x-bind:data-disabled="devPending ? '' : null" x-bind:aria-busy="devPending ? 'true' : null" class="border border-dashed border-border text-muted-foreground">
                <template x-if="devPending"><x-nq::spinner /></template>
                <x-lucide-terminal aria-hidden="true" />
                {{ $l['devLogin'] }}
            </x-nq::button>
        @endif
    </div>
@else
    <form data-slot="login-form" novalidate x-data="nqLoginForm(@js($config))" x-bind:data-state="sentTo ? 'sent' : 'idle'"
        x-bind:aria-busy="pending ? 'true' : null" x-on:submit.prevent="onSubmit()" x-on:input="clear($event.target.name)"
        {{ $attributes->cn('flex w-full flex-col gap-4') }}>
        <div class="contents" x-show="! sentTo">
            <x-nq::login-form.summary />
            <x-nq::field name="email" x-model="bad.email">
                <x-nq::field.label for="{{ $uid }}-email">{{ $l['email'] }}</x-nq::field.label>
                <x-nq::field.input id="{{ $uid }}-email" type="email" ltr inputmode="email" value="{{ $defaultEmail }}"
                    autocomplete="{{ $passkey && $passkeyAutofill ? 'username webauthn' : ($withPassword ? 'username' : 'email') }}"
                    placeholder="{{ $l['emailPlaceholder'] }}" aria-describedby="{{ $uid }}-email-error" x-bind:aria-invalid="bad.email ? 'true' : null" />
                <x-nq::field.error id="{{ $uid }}-email-error"><span x-text="fe.email"></span></x-nq::field.error>
            </x-nq::field>
            @if ($withPassword)
                <x-nq::field name="password" x-model="bad.password">
                    <div class="flex items-baseline justify-between gap-3">
                        <x-nq::field.label for="{{ $uid }}-password">{{ $l['password'] }}</x-nq::field.label>
                        @if ($forgotPassword && ! $forgotPassword->isEmpty())
                            <span class="text-caption">{{ $forgotPassword }}</span>
                        @endif
                    </div>
                    <x-nq::password-input id="{{ $uid }}-password" name="password" autocomplete="current-password"
                        aria-describedby="{{ $uid }}-password-error" x-bind:aria-invalid="bad.password ? 'true' : null" />
                    <x-nq::field.error id="{{ $uid }}-password-error"><span x-text="fe.password"></span></x-nq::field.error>
                </x-nq::field>
                @if ($showRemember)
                    <label class="flex items-center gap-2 text-body-sm text-foreground">
                        <x-nq::checkbox name="remember" value="1" x-model="remember" />
                        {{ $l['remember'] }}
                    </label>
                @endif
            @endif
            <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="offFor('{{ $primaryIntent }}')"
                x-bind:data-disabled="offFor('{{ $primaryIntent }}') ? '' : null" x-bind:aria-busy="loadingFor('{{ $primaryIntent }}') ? 'true' : null">
                <template x-if="loadingFor('{{ $primaryIntent }}')"><x-nq::spinner /></template>
                {{ $magicPrimary ? $l['magicLink'] : $l['submit'] }}
            </x-nq::button>
            @if ($withMagic && $withPassword)
                <x-nq::button type="button" variant="secondary" size="lg" data-slot="login-form-magic-link" x-on:click="send('magic-link')"
                    x-bind:disabled="offFor('magic-link')" x-bind:data-disabled="offFor('magic-link') ? '' : null" x-bind:aria-busy="loadingFor('magic-link') ? 'true' : null">
                    <template x-if="loadingFor('magic-link')"><x-nq::spinner /></template>
                    <x-lucide-mail-check aria-hidden="true" />
                    {{ $l['magicLink'] }}
                </x-nq::button>
            @endif
            @if ($divide)
                <x-nq::oauth-buttons.divider x-show="dividerOn()" style="display: none">{{ $l['divider'] }}</x-nq::oauth-buttons.divider>
            @endif
            @if ($passkey)
                <x-nq::button type="button" variant="secondary" size="lg" data-slot="login-form-passkey" x-show="passkeyOn" style="display: none" x-on:click="passkey()"
                    x-bind:disabled="passkeyPending || pending || devPending" x-bind:data-disabled="passkeyPending ? '' : null" x-bind:aria-busy="passkeyPending ? 'true' : null">
                    <template x-if="passkeyPending"><x-nq::spinner /></template>
                    <x-lucide-key-round aria-hidden="true" />
                    {{ $l['passkey'] }}
                </x-nq::button>
            @endif
            @if (count($oauthProviders))
                <x-nq::oauth-buttons :providers="$oauthProviders" intent="signin" />
            @endif
            @if ($devLogin)
                <x-nq::button type="button" variant="ghost" size="lg" data-slot="login-form-dev" x-on:click="devLogin()" x-bind:disabled="devPending || pending || passkeyPending"
                    x-bind:data-disabled="devPending ? '' : null" x-bind:aria-busy="devPending ? 'true' : null" class="border border-dashed border-border text-muted-foreground">
                    <template x-if="devPending"><x-nq::spinner /></template>
                    <x-lucide-terminal aria-hidden="true" />
                    {{ $l['devLogin'] }}
                </x-nq::button>
            @endif
        </div>
        <div class="contents" x-show="sentTo" style="display: none">
            <div class="flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
                <x-lucide-mail-check aria-hidden="true" class="size-5" />
            </div>
            <div role="status" class="flex flex-col gap-1.5">
                <h2 data-slot="login-form-sent-title" tabindex="-1" class="text-h3 text-foreground outline-none">{{ $l['sentTitle'] }}</h2>
                <p class="text-body-sm text-muted-foreground">{{ $before }}<bdi dir="ltr" class="font-medium text-foreground" x-text="sentTo"></bdi>{{ $after }}</p>
            </div>
            <x-nq::alert tone="danger" x-show="resendError" style="display: none"><span x-text="resendError"></span></x-nq::alert>
            <span role="status" class="sr-only" x-text="resendDone && cooldown > 0 ? @js($l['resent']) : ''"></span>
            <x-nq::button type="button" variant="secondary" size="lg" data-slot="login-form-resend" x-on:click="resend()"
                x-bind:disabled="resendOff()" x-bind:data-disabled="resendOff() ? '' : null" x-bind:aria-busy="resendPending ? 'true' : null">
                <template x-if="resendPending"><x-nq::spinner /></template>
                <span x-text="resendLabel()">{{ $l['resend'] }}</span>
            </x-nq::button>
            <x-nq::button type="button" variant="link" size="sm" class="self-start" x-on:click="changeEmail()">{{ $l['changeEmail'] }}</x-nq::button>
        </div>
    </form>
@endif

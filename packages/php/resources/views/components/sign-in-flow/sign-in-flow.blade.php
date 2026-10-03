{{-- <x-nq::sign-in-flow password forgot :oauth-providers="['google']" x-on:nq-sign-in-password="$event.detail.waitUntil(signIn($event.detail))"><x-slot:forgot-password><a href="/forgot-password">Forgot password?</a></x-slot:forgot-password></x-nq::sign-in-flow>
     Identifier-first sign-in. The page starts with only an email field and the provider buttons; your listener then picks the next step for that address: a
     password, a one-time code, a sign-in link, the organisation's SSO, sign-up, or a "can't sign in here" notice. After a password it can ask for a second factor,
     and "Forgot password?" opens the reset request in place. Put it in an auth-layout.
     Flags say which handlers you wired (the Blade component cannot see your listeners): password (the default step is the password step), request-code (adds
     "Email me a code instead" and makes the code step the default without password), magic-link (adds "Email me a sign-in link" and the resend; the default step
     when it is the only one), forgot (adds "Forgot password?" unless the forgot-password slot is set), two-factor-passkey, passkey, passkey-autofill.
     With none of password / request-code / magic-link every address goes to the password step.
     Events (bubble from the flow; each has detail.waitUntil(promise); resolve nothing for success or { error, fieldErrors } to show a failure):
       nq-sign-in-identify { email }: resolve the next step ({ step: "password" | "code" | "sso" | "register" | "link-sent" | "blocked", alternatives, length, connection,
         message }) or nothing for the default step. nq-sign-in-password { email, password, remember }: also { twoFactor: true }.
       nq-sign-in-two-factor { email, code, method, trustDevice }, nq-two-factor-passkey, nq-sign-in-magic-link { email }, nq-sign-in-request-code { email },
       nq-sign-in-code { email, code }, nq-sign-in-forgot { email }, nq-sign-in-sso { email }, nq-sign-in-register { email }, nq-sign-in-step { step, email },
       nq-passkey, nq-passkey-autofill { signal }, nq-oauth-select { id, wait }.
     oauth-providers: see <x-nq::oauth-buttons>. last-used: "passkey" or a provider id (adds the "Last used" badge). show-remember: default true. default-email.
     resend-seconds: default 30. code-length / two-factor-length: digits of the code boxes (default 6; a length sent by your listener
     wins: { step: "code", length } and the two-factor { twoFactor: true, length }; two-factor lengths 4 to 8 are built in, others use two-factor-length). Slot forgot-password sits beside the password label. labels: override any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['password' => false, 'magicLink' => false, 'requestCode' => false, 'forgot' => false, 'twoFactorPasskey' => false, 'passkey' => false, 'passkeyAutofill' => false, 'oauthProviders' => [], 'lastUsed' => null, 'showRemember' => true, 'defaultEmail' => '', 'resendSeconds' => 30, 'codeLength' => 6, 'twoFactorLength' => 6, 'forgotPassword' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'email' => $t::t('Email', 'البريد الإلكتروني'),
        'emailPlaceholder' => 'you@company.com',
        'continue' => $t::t('Continue', 'متابعة'),
        'divider' => $t::t('or', 'أو'),
        'passkey' => $t::t('Sign in with a passkey', 'تسجيل الدخول بمفتاح المرور'),
        'change' => $t::t('Change', 'تغيير'),
        'password' => $t::t('Password', 'كلمة المرور'),
        'remember' => $t::t('Keep me signed in', 'إبقائي مسجّلًا'),
        'signIn' => $t::t('Sign in', 'تسجيل الدخول'),
        'useCode' => $t::t('Email me a code instead', 'أرسل لي رمزًا بالبريد بدلًا من ذلك'),
        'ssoTitle' => $t::t('Your organisation uses single sign-on', 'مؤسستك تستخدم الدخول الموحّد'),
        'ssoWith' => $t::t('Continue with {connection}', 'المتابعة باستخدام {connection}'),
        'ssoBody' => $t::t("You will sign in with your organisation's identity provider and come back here.", 'ستسجّل الدخول عبر مزوّد الهوية في مؤسستك ثم تعود إلى هنا.'),
        'ssoContinue' => $t::t('Continue with SSO', 'المتابعة بالدخول الموحّد'),
        'registerTitle' => $t::t('No account uses this email', 'لا يوجد حساب بهذا البريد'),
        'registerBody' => $t::t('Create one in a minute, or try another address.', 'أنشئ حسابًا في دقيقة، أو جرّب بريدًا آخر.'),
        'register' => $t::t('Create an account', 'إنشاء حساب'),
        'otherEmail' => $t::t('Use another email', 'استخدام بريد آخر'),
        'emailRequired' => $t::t('Enter your email address.', 'أدخل بريدك الإلكتروني.'),
        'emailInvalid' => $t::t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.'),
        'passwordRequired' => $t::t('Enter your password.', 'أدخل كلمة المرور.'),
        'capsLock' => $t::t('Caps Lock is on.', 'مفتاح الأحرف الكبيرة (Caps Lock) مفعّل.'),
        'lastUsed' => $t::t('Last used', 'آخر استخدام'),
        'errorTitle' => $t::t('Fix these to continue', 'صحّح ما يلي للمتابعة'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'magicLink' => $t::t('Email me a sign-in link', 'أرسل لي رابط تسجيل الدخول'),
        'linkSentTitle' => $t::t('Check your email', 'تحقّق من بريدك'),
        'linkSentBody' => $t::t('We sent a sign-in link to {email}. Open it on this device to finish signing in.', 'أرسلنا رابط تسجيل الدخول إلى {email}. افتحه على هذا الجهاز لإكمال تسجيل الدخول.'),
        'resend' => $t::t('Send the link again', 'أرسل الرابط مرة أخرى'),
        'resendIn' => $t::t('Send again in {time}', 'أعد الإرسال بعد {time}'),
        'resent' => $t::t('We sent a new link.', 'أرسلنا رابطًا جديدًا.'),
        'blockedTitle' => $t::t("This account can't sign in here", 'لا يمكن لهذا الحساب تسجيل الدخول هنا'),
        'blockedBody' => $t::t('Contact your administrator, or try another address.', 'تواصل مع المسؤول، أو جرّب بريدًا آخر.'),
        'forgotPassword' => $t::t('Forgot password?', 'نسيت كلمة المرور؟'),
        'backToSignIn' => $t::t('Back to sign in', 'العودة لتسجيل الدخول'),
    ], (array) $labels);
    // The code step is the verify-otp-form's markup (its destination is the address chosen at run time, so it is masked in the browser).
    $otp = [
        'description' => $t::t('Enter the {length}-digit code we sent to {destination}.', 'أدخل الرمز المكوّن من {length} أرقام الذي أرسلناه إلى {destination}.'),
        'group' => $t::t('Verification code', 'رمز التحقق'),
        'submit' => $t::t('Verify', 'تحقّق'),
        'noCode' => $t::t('Did not get a code?', 'لم يصلك الرمز؟'),
        'resend' => $t::t('Resend code', 'إعادة إرسال الرمز'),
        'resendIn' => $t::t('Resend in {time}', 'إعادة الإرسال بعد {time}'),
        'resent' => $t::t('We sent a new code.', 'أرسلنا رمزًا جديدًا.'),
        'incomplete' => $t::t('Enter all {length} digits.', 'أدخل الأرقام الـ {length} كاملة.'),
        'failed' => $l['failed'],
    ];
    [$otpBefore, $otpAfter] = array_pad(explode("\0", str_replace('{destination}', "\0", $otp['description']), 2), 2, '');
    [$sentBefore, $sentAfter] = array_pad(explode('{email}', $l['linkSentBody'], 2), 2, '');
    $uid = 'nq-signin-'.\Illuminate\Support\Str::random(6);
    $config = [
        'password' => (bool) $password, 'magicLink' => (bool) $magicLink, 'requestCode' => (bool) $requestCode, 'forgotPassword' => (bool) $forgot,
        'passkey' => (bool) $passkey, 'passkeyAutofill' => (bool) $passkeyAutofill, 'oauth' => count($oauthProviders) > 0,
        'resendSeconds' => (int) $resendSeconds, 'defaultEmail' => (string) $defaultEmail, 'labels' => $l,
        'codeLength' => (int) $codeLength, 'twoFactorLength' => (int) $twoFactorLength,
    ];
    $otpConfig = [
        'length' => (int) $codeLength, 'autoSubmit' => true, 'resend' => (bool) $requestCode, 'resendSeconds' => (int) $resendSeconds,
        'names' => ['code'], 'failed' => $otp['failed'], 'labels' => $otp,
    ];
    $has = fn ($s) => $s && ! $s->isEmpty();
    $notice = 'flex gap-3 rounded-card border border-border bg-muted/50 p-4';
    $tile = 'inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-card text-foreground [&_svg]:size-4';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'sign-in-flow') }}" x-data="nqSignInFlow(@js($config))" x-bind:data-step="step"
    x-bind:data-moved="moved ? '' : null" {{ $attributes->except('data-slot')->cn('flex w-full flex-col') }}>
    {{-- Re-keyed by the step, like React's <div key={step}>: every change builds a new wrapper, so the entrance animation replays. --}}
    <template x-for="stepKey in [step]" :key="stepKey">
    <div data-slot="sign-in-flow-step" class="flex flex-col gap-4">
        {{-- Email: the field, the providers, a passkey. --}}
        <template x-if="step === 'email'">
            <div class="contents" x-data="nqSignInFlowEmail(@js($config))" x-bind:aria-busy="pending ? 'true' : null">
                <form novalidate data-slot="sign-in-flow-email" class="flex flex-col gap-4" x-bind:aria-busy="pending ? 'true' : null" x-on:submit.prevent="onSubmit()" x-on:input="clear($event.target.name)">
                    <x-nq::login-form.summary />
                    <x-nq::field name="email" x-model="bad.email">
                        <x-nq::field.label for="{{ $uid }}-email">{{ $l['email'] }}</x-nq::field.label>
                        <x-nq::field.input id="{{ $uid }}-email" type="email" ltr inputmode="email" value="{{ $defaultEmail }}"
                            autocomplete="{{ $passkey && $passkeyAutofill ? 'username webauthn' : 'username' }}" placeholder="{{ $l['emailPlaceholder'] }}"
                            aria-describedby="{{ $uid }}-email-error" x-bind:aria-invalid="bad.email ? 'true' : null" />
                        <x-nq::field.error id="{{ $uid }}-email-error"><span x-text="fe.email"></span></x-nq::field.error>
                    </x-nq::field>
                    <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="anyBusy()" x-bind:data-disabled="anyBusy() ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
                        <template x-if="pending"><x-nq::spinner /></template>
                        {{ $l['continue'] }}
                    </x-nq::button>
                </form>
                @if ($passkey || count($oauthProviders))
                    <x-nq::oauth-buttons.divider x-show="dividerOn()" style="display: none">{{ $l['divider'] }}</x-nq::oauth-buttons.divider>
                @endif
                @if (count($oauthProviders))
                    <x-nq::oauth-buttons :providers="$oauthProviders" intent="continue" :last-used="$lastUsed" :labels="['lastUsed' => $l['lastUsed']]" />
                @endif
                @if ($passkey)
                    <x-nq::button type="button" variant="secondary" data-slot="sign-in-flow-passkey" class="relative" style="display: none" x-show="passkeyOn" x-on:click="passkey()"
                        x-bind:disabled="pending || passkeyPending" x-bind:data-disabled="pending || passkeyPending ? '' : null" x-bind:aria-busy="passkeyPending ? 'true' : null">
                        <template x-if="passkeyPending"><x-nq::spinner /></template>
                        <x-lucide-key-round aria-hidden="true" />
                        {{ $l['passkey'] }}
                        @if ($lastUsed === 'passkey')
                            <x-nq::oauth-buttons.last-used>{{ $l['lastUsed'] }}</x-nq::oauth-buttons.last-used>
                        @endif
                    </x-nq::button>
                @endif
            </div>
        </template>

        {{-- The address being signed in, with a way back. --}}
        <template x-if="showIdentity()">
            <div data-slot="sign-in-flow-identity" class="flex items-center gap-2 rounded-control border border-border bg-muted/60 py-1 ps-3 pe-1">
                <x-lucide-mail aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                <bdi dir="ltr" class="min-w-0 flex-1 truncate text-start text-body-sm text-foreground" x-text="email"></bdi>
                <x-nq::button type="button" variant="ghost" size="sm" x-on:click="go(null)">
                    <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ $l['change'] }}
                </x-nq::button>
            </div>
        </template>

        {{-- Password. --}}
        <template x-if="step === 'password'">
            <form novalidate data-slot="sign-in-flow-password" class="flex flex-col gap-4" x-data="nqSignInFlowPassword(@js($config))" x-bind:aria-busy="pending ? 'true' : null"
                x-on:submit.prevent="onSubmit()" x-on:input="clear($event.target.name)">
                {{-- Password managers pair the saved password with this username. --}}
                <input type="email" name="username" autocomplete="username" x-bind:value="email" readonly hidden />
                <x-nq::login-form.summary />
                <x-nq::field name="password" x-model="bad.password">
                    <div class="flex items-baseline justify-between gap-3">
                        <x-nq::field.label for="{{ $uid }}-password">{{ $l['password'] }}</x-nq::field.label>
                        @if ($has($forgotPassword))
                            <span class="text-caption">{{ $forgotPassword }}</span>
                        @elseif ($forgot)
                            <span class="text-caption">
                                <x-nq::button type="button" variant="link" size="sm" data-slot="sign-in-flow-forgot-link" x-on:click="move('forgot')">{{ $l['forgotPassword'] }}</x-nq::button>
                            </span>
                        @endif
                    </div>
                    <x-nq::password-input id="{{ $uid }}-password" name="password" autocomplete="current-password" aria-describedby="{{ $uid }}-password-error"
                        x-bind:aria-invalid="bad.password ? 'true' : null" x-on:keydown="readCaps($event)" x-on:keyup="readCaps($event)" x-on:blur="caps = false" />
                    <x-nq::field.error id="{{ $uid }}-password-error"><span x-text="fe.password"></span></x-nq::field.error>
                    {{-- Always in the accessibility tree, so screen readers hear the warning when it appears. --}}
                    <p data-slot="sign-in-flow-caps" role="status" class="flex items-center gap-1.5 text-caption text-nq-warning-text" x-bind:class="caps ? '' : 'sr-only'">
                        <x-lucide-triangle-alert aria-hidden="true" class="size-3.5 shrink-0" x-show="caps" style="display: none" />
                        <span x-text="caps ? @js($l['capsLock']) : ''"></span>
                    </p>
                </x-nq::field>
                @if ($showRemember)
                    <label class="flex items-center gap-2 text-body-sm text-foreground">
                        <x-nq::checkbox name="remember" value="1" x-model="remember" />
                        {{ $l['remember'] }}
                    </label>
                @endif
                <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="altBusy()" x-bind:data-disabled="altBusy() ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
                    <template x-if="pending"><x-nq::spinner /></template>
                    {{ $l['signIn'] }}
                </x-nq::button>
                @if ($magicLink)
                    <x-nq::button type="button" variant="ghost" size="lg" data-slot="sign-in-flow-magic-link" style="display: none" x-show="showLink()" x-on:click="alt('link')"
                        x-bind:disabled="pending || codePending" x-bind:data-disabled="pending || codePending ? '' : null" x-bind:aria-busy="linkPending ? 'true' : null">
                        <template x-if="linkPending"><x-nq::spinner /></template>
                        <x-lucide-link-2 aria-hidden="true" />
                        {{ $l['magicLink'] }}
                    </x-nq::button>
                @endif
                @if ($requestCode)
                    <x-nq::button type="button" variant="ghost" size="lg" style="display: none" x-show="showCode()" x-on:click="alt('code')"
                        x-bind:disabled="pending || linkPending" x-bind:data-disabled="pending || linkPending ? '' : null" x-bind:aria-busy="codePending ? 'true' : null">
                        <template x-if="codePending"><x-nq::spinner /></template>
                        <x-lucide-mail aria-hidden="true" />
                        {{ $l['useCode'] }}
                    </x-nq::button>
                @endif
            </form>
        </template>

        {{-- The emailed one-time code (the verify-otp-form's markup). --}}
        <template x-if="step === 'code'">
            <form data-slot="verify-otp-form" novalidate class="flex w-full flex-col gap-4" x-data="nqVerifyOtpForm({ ...@js($otpConfig), length: codeLen })" x-bind:aria-busy="pending ? 'true' : null"
                x-on:submit.prevent="onSubmit()" x-on:nq-verify-otp.stop="relay($event, 'nq-sign-in-code', { code: $event.detail.code })"
                x-on:nq-verify-otp-resend.stop="relay($event, 'nq-sign-in-request-code')">
                <p class="text-body-sm text-muted-foreground"><span x-text="@js($otpBefore).replace('{length}', codeLen)">{{ str_replace('{length}', (string) $codeLength, $otpBefore) }}</span><bdi dir="ltr" class="font-medium text-foreground" x-text="masked()"></bdi><span x-text="@js($otpAfter).replace('{length}', codeLen)">{{ str_replace('{length}', (string) $codeLength, $otpAfter) }}</span></p>
                <div class="flex flex-col gap-2" x-effect="markInvalid($el)">
                    {{-- The otp-input's markup, with the boxes counted at run time: the length comes from the listener (next.length) or code-length. --}}
                    <div role="group" dir="ltr" data-slot="otp-input" x-data="nqOtpInput('', codeLen, 'numeric')" x-modelable="value" x-model="code" x-on:complete="onComplete($event.detail)"
                        aria-label="{{ $otp['group'] }}" aria-describedby="{{ $uid }}-code-message" class="inline-flex items-center gap-2 self-center">
                        <template x-for="n in codeLen" :key="n">
                            <input data-slot="otp-input-box" x-bind="box(n - 1)" type="text" inputmode="numeric" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" autofocus
                                x-bind:aria-label="@js($t::t('Digit {n} of {total}', 'الخانة {n} من {total}')).replace('{n}', n).replace('{total}', codeLen)"
                                class="size-control min-h-[var(--nq-touch-min,0px)] min-w-0 rounded-control border border-input bg-card p-0 text-center text-body font-medium tabular-nums text-foreground transition-colors duration-150 ease-nq outline-none focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]" />
                        </template>
                        <input type="hidden" name="code" x-bind:value="value" />
                    </div>
                    <p id="{{ $uid }}-code-message" role="alert" class="text-center text-caption text-nq-danger-text" style="display: none" x-show="message()" x-text="message()"></p>
                </div>
                <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
                    <template x-if="pending"><x-nq::spinner /></template>
                    {{ $otp['submit'] }}
                </x-nq::button>
                @if ($requestCode)
                    <div class="flex flex-wrap items-center justify-center gap-x-1 text-body-sm text-muted-foreground">
                        <span>{{ $otp['noCode'] }}</span>
                        <x-nq::button type="button" variant="link" size="sm" data-slot="verify-otp-resend" x-on:click="resend()"
                            x-bind:disabled="resendOff()" x-bind:data-disabled="resendOff() ? '' : null" x-bind:aria-busy="resendPending ? 'true' : null">
                            <template x-if="resendPending"><x-nq::spinner /></template>
                            <span x-text="resendLabel()">{{ $otp['resend'] }}</span>
                        </x-nq::button>
                    </div>
                @endif
                <span role="status" class="sr-only" x-text="resendSent ? @js($otp['resent']) : ''"></span>
            </form>
        </template>

        {{-- The second factor, after a password. --}}
        @foreach (array_values(array_unique(array_merge([(int) $twoFactorLength], range(4, 8)))) as $tfLen)
            <template x-if="step === 'two-factor' && twoLen === {{ $tfLen }}">
                <x-nq::two-factor-challenge :length="$tfLen" :passkey="$twoFactorPasskey"
                    x-on:nq-two-factor.stop="relay($event, 'nq-sign-in-two-factor', $event.detail)" />
            </template>
        @endforeach

        {{-- A sign-in link was sent. --}}
        <template x-if="step === 'link-sent'">
            <div data-slot="sign-in-flow-link-sent" class="flex flex-col gap-4" x-data="nqSignInFlowLinkSent(@js($config))">
                <div role="status" class="{{ $notice }}">
                    <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text [&_svg]:size-4">
                        <x-lucide-mail-check aria-hidden="true" />
                    </span>
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <p data-slot="sign-in-flow-link-heading" tabindex="-1" class="text-label text-foreground outline-none">{{ $l['linkSentTitle'] }}</p>
                        <p class="text-body-sm text-muted-foreground">{{ $sentBefore }}<bdi dir="ltr" class="font-medium text-foreground" x-text="email"></bdi>{{ $sentAfter }}</p>
                    </div>
                </div>
                <x-nq::alert tone="danger" x-show="resendError" style="display: none"><span x-text="resendError"></span></x-nq::alert>
                <span role="status" class="sr-only" x-text="resendDone && cooldown > 0 ? @js($l['resent']) : ''"></span>
                @if ($magicLink)
                    <x-nq::button type="button" variant="secondary" size="lg" data-slot="sign-in-flow-resend" x-on:click="resend()"
                        x-bind:disabled="resendOff()" x-bind:data-disabled="resendOff() ? '' : null" x-bind:aria-busy="resendPending ? 'true' : null">
                        <template x-if="resendPending"><x-nq::spinner /></template>
                        <span x-text="resendLabel()">{{ $l['resend'] }}</span>
                    </x-nq::button>
                @endif
            </div>
        </template>

        {{-- This address may not sign in here. --}}
        <template x-if="step === 'blocked'">
            <div data-slot="sign-in-flow-blocked" class="flex flex-col gap-4">
                <div data-slot="sign-in-flow-notice" class="{{ $notice }}">
                    <span class="{{ $tile }}"><x-lucide-shield-off aria-hidden="true" /></span>
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <p class="text-label text-foreground">{{ $l['blockedTitle'] }}</p>
                        <p class="text-body-sm text-muted-foreground" x-text="blockedBody()">{{ $l['blockedBody'] }}</p>
                    </div>
                </div>
                <x-nq::button type="button" variant="secondary" size="lg" x-on:click="go(null)">{{ $l['otherEmail'] }}</x-nq::button>
            </div>
        </template>

        {{-- The organisation's single sign-on. --}}
        <template x-if="step === 'sso'">
            <form novalidate data-slot="sign-in-flow-sso" class="flex flex-col gap-4" x-data="nqSignInFlowSso(@js($config))" x-bind:aria-busy="pending ? 'true' : null" x-on:submit.prevent="onSubmit()">
                <x-nq::login-form.summary />
                <div data-slot="sign-in-flow-notice" class="{{ $notice }}">
                    <span class="{{ $tile }}"><x-lucide-building-2 aria-hidden="true" /></span>
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <p class="text-label text-foreground">{{ $l['ssoTitle'] }}</p>
                        <p class="text-body-sm text-muted-foreground">{{ $l['ssoBody'] }}</p>
                    </div>
                </div>
                <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
                    <template x-if="pending"><x-nq::spinner /></template>
                    <span x-text="ssoLabel()">{{ $l['ssoContinue'] }}</span>
                </x-nq::button>
            </form>
        </template>

        {{-- No account uses this address. --}}
        <template x-if="step === 'register'">
            <div data-slot="sign-in-flow-register" class="flex flex-col gap-4">
                <div data-slot="sign-in-flow-notice" class="{{ $notice }}">
                    <span class="{{ $tile }}"><x-lucide-user-plus aria-hidden="true" /></span>
                    <div class="flex min-w-0 flex-col gap-0.5">
                        <p class="text-label text-foreground">{{ $l['registerTitle'] }}</p>
                        <p class="text-body-sm text-muted-foreground">{{ $l['registerBody'] }}</p>
                    </div>
                </div>
                <x-nq::button type="button" variant="primary" size="lg" x-on:click="register()">{{ $l['register'] }}</x-nq::button>
                <x-nq::button type="button" variant="ghost" size="lg" x-on:click="go(null)">{{ $l['otherEmail'] }}</x-nq::button>
            </div>
        </template>

        {{-- Forgot password, in place. --}}
        <template x-if="step === 'forgot'">
            <div data-slot="sign-in-flow-forgot" class="flex flex-col gap-4" x-init="$nextTick(() => fillEmail($el))">
                <x-nq::forgot-password-form :resend-seconds="$resendSeconds"
                    x-on:nq-forgot-password.stop="relay($event, 'nq-sign-in-forgot', { email: $event.detail.email })"
                    x-on:nq-forgot-password-resend.stop="relay($event, 'nq-sign-in-forgot', { email: $event.detail.email })" />
                <x-nq::button type="button" variant="ghost" size="lg" x-on:click="move('password')">
                    <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
                    {{ $l['backToSignIn'] }}
                </x-nq::button>
            </div>
        </template>
    </div>
    </template>
</div>

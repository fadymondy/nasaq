{{-- <x-nq::register-form action="/register" x-on:nq-register="$event.detail.waitUntil(createAccount($event.detail))">
         <x-slot:terms>I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a></x-slot:terms>
     </x-nq::register-form>
     Sign-up: name, email, a password with a strength meter, confirmation, a terms checkbox and optional provider buttons. The confirmation
     match and the minimum length are checked in the browser before it hands the values to you: listen for nq-register on it
     ({ name, email, password, acceptTerms, waitUntil(promise) }). Resolve nothing for success, or { error, fieldErrors } (keys name, email,
     password, confirm, terms); a rejection shows "Something went wrong". With no listener and an action attribute it submits natively
     (fields name, email, password, confirm, terms). min-password-length: default 8. require-terms: default true. oauth-providers: see
     <x-nq::oauth-buttons> (its nq-oauth-select event bubbles from the form). labels: override any string. Slot terms: the terms sentence with links.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['minPasswordLength' => 8, 'requireTerms' => true, 'oauthProviders' => [], 'terms' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'name' => $t::t('Full name', 'الاسم الكامل'),
        'namePlaceholder' => $t::t('Your name', 'اسمك'),
        'email' => $t::t('Email', 'البريد الإلكتروني'),
        'emailPlaceholder' => 'you@example.com',
        'password' => $t::t('Password', 'كلمة المرور'),
        'passwordHint' => $t::t('At least {min} characters.', '{min} أحرف على الأقل.'),
        'confirm' => $t::t('Confirm password', 'تأكيد كلمة المرور'),
        'terms' => $t::t('I agree to the terms of service and privacy policy', 'أوافق على شروط الخدمة وسياسة الخصوصية'),
        'submit' => $t::t('Create account', 'إنشاء حساب'),
        'divider' => $t::t('or sign up with email', 'أو سجّل بالبريد الإلكتروني'),
        'nameRequired' => $t::t('Enter your name.', 'أدخل اسمك.'),
        'emailRequired' => $t::t('Enter your email address.', 'أدخل بريدك الإلكتروني.'),
        'emailInvalid' => $t::t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.'),
        'passwordShort' => $t::t('Use at least {min} characters.', 'استخدم {min} أحرف على الأقل.'),
        'confirmMismatch' => $t::t('The passwords do not match.', 'كلمتا المرور غير متطابقتين.'),
        'termsRequired' => $t::t('Accept the terms to continue.', 'وافق على الشروط للمتابعة.'),
        'errorTitle' => $t::t('Fix these to create your account', 'صحّح ما يلي لإنشاء حسابك'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $min = (string) $minPasswordLength;
    $uid = 'nq-register-'.\Illuminate\Support\Str::random(6);
    $config = [
        'minLength' => (int) $minPasswordLength, 'requireTerms' => (bool) $requireTerms,
        'names' => ['name', 'email', 'password', 'confirm', 'terms'],
        'fieldLabels' => ['name' => $l['name'], 'email' => $l['email'], 'password' => $l['password'], 'confirm' => $l['confirm']],
        'errorTitle' => $l['errorTitle'], 'failed' => $l['failed'], 'labels' => $l,
    ];
@endphp
<form data-slot="register-form" novalidate x-data="nqRegisterForm(@js($config))" x-bind:aria-busy="pending ? 'true' : null"
    x-on:submit.prevent="onSubmit()" x-on:input="clear($event.target.name)" {{ $attributes->cn('flex w-full flex-col gap-4') }}>
    @if (count($oauthProviders))
        <x-nq::oauth-buttons :providers="$oauthProviders" intent="signup" />
        <x-nq::oauth-buttons.divider>{{ $l['divider'] }}</x-nq::oauth-buttons.divider>
    @endif
    <x-nq::login-form.summary />
    <x-nq::field name="name" x-model="bad.name">
        <x-nq::field.label for="{{ $uid }}-name">{{ $l['name'] }}</x-nq::field.label>
        <x-nq::field.input id="{{ $uid }}-name" autocomplete="name" placeholder="{{ $l['namePlaceholder'] }}"
            aria-describedby="{{ $uid }}-name-error" x-bind:aria-invalid="bad.name ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-name-error"><span x-text="fe.name"></span></x-nq::field.error>
    </x-nq::field>
    <x-nq::field name="email" x-model="bad.email">
        <x-nq::field.label for="{{ $uid }}-email">{{ $l['email'] }}</x-nq::field.label>
        <x-nq::field.input id="{{ $uid }}-email" type="email" ltr autocomplete="email" inputmode="email" placeholder="{{ $l['emailPlaceholder'] }}"
            aria-describedby="{{ $uid }}-email-error" x-bind:aria-invalid="bad.email ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-email-error"><span x-text="fe.email"></span></x-nq::field.error>
    </x-nq::field>
    <x-nq::field x-model="bad.password">
        <x-nq::field.label for="{{ $uid }}-password">{{ $l['password'] }}</x-nq::field.label>
        <x-nq::password-input id="{{ $uid }}-password" name="password" autocomplete="new-password" show-strength
            aria-describedby="{{ $uid }}-password-hint {{ $uid }}-password-error" x-bind:aria-invalid="bad.password ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-password-error"><span x-text="fe.password"></span></x-nq::field.error>
        <x-nq::field.description id="{{ $uid }}-password-hint" x-show="! bad.password">{{ str_replace('{min}', $min, $l['passwordHint']) }}</x-nq::field.description>
    </x-nq::field>
    <x-nq::field x-model="bad.confirm">
        <x-nq::field.label for="{{ $uid }}-confirm">{{ $l['confirm'] }}</x-nq::field.label>
        <x-nq::password-input id="{{ $uid }}-confirm" name="confirm" autocomplete="new-password"
            aria-describedby="{{ $uid }}-confirm-error" x-bind:aria-invalid="bad.confirm ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-confirm-error"><span x-text="fe.confirm"></span></x-nq::field.error>
    </x-nq::field>
    @if ($requireTerms)
        <x-nq::field x-model="bad.terms">
            <label class="flex items-start gap-2 text-body-sm text-foreground">
                <x-nq::checkbox name="terms" value="1" x-model="accepted" class="mt-0.5" x-bind:aria-invalid="bad.terms ? 'true' : null" />
                <span>{!! $terms && ! $terms->isEmpty() ? $terms : e($l['terms']) !!}</span>
            </label>
            <x-nq::field.error><span x-text="fe.terms"></span></x-nq::field.error>
        </x-nq::field>
    @endif
    <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
        <template x-if="pending"><x-nq::spinner /></template>
        {{ $l['submit'] }}
    </x-nq::button>
</form>

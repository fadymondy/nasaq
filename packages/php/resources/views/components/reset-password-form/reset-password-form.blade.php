{{-- <x-nq::reset-password-form rules sign-in="/login" request-link="/forgot-password" x-on:nq-reset-password="$event.detail.waitUntil(reset($event.detail.password))" />
     Choose a new password after following a reset link: new and confirm fields, a strength meter and an optional requirement checklist.
     After submit it shows "Password changed" with a Sign in button, or "This link has expired" with a Send a new link button.
     Events (bubble from the root; detail.waitUntil(promise); resolve nothing for success, { expired: true } for a used or old link, or
     { error, fieldErrors } (keys password, confirm)): nq-reset-password { password }. With no listener and an action attribute it submits natively
     (fields password, confirm). rules: true for the default policy (12 characters, upper, lower, digit, symbol) or ['minLength' => 10, 'require' => ['digit']];
     every rule is then required. min-password-length: default 8, or the policy minimum. state: start as "idle" | "success" | "expired"
     (set it to "expired" when the token was checked on load). sign-in / request-link: a URL renders a link button; `true` renders a button
     that fires nq-reset-sign-in / nq-reset-request-link; omit to hide it. labels: override any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['minPasswordLength' => null, 'rules' => null, 'state' => 'idle', 'signIn' => null, 'requestLink' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'password' => $t::t('New password', 'كلمة المرور الجديدة'),
        'passwordHint' => $t::t('At least {min} characters.', '{min} أحرف على الأقل.'),
        'confirm' => $t::t('Confirm new password', 'تأكيد كلمة المرور الجديدة'),
        'submit' => $t::t('Reset password', 'إعادة تعيين كلمة المرور'),
        'passwordShort' => $t::t('Use at least {min} characters.', 'استخدم {min} أحرف على الأقل.'),
        'passwordWeak' => $t::t('Meet every requirement below.', 'استوفِ كل المتطلبات أدناه.'),
        'confirmMismatch' => $t::t('The passwords do not match.', 'كلمتا المرور غير متطابقتين.'),
        'errorTitle' => $t::t('Fix these to reset your password', 'صحّح ما يلي لإعادة تعيين كلمة المرور'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'successTitle' => $t::t('Password changed', 'تم تغيير كلمة المرور'),
        'successBody' => $t::t('You can now sign in with your new password.', 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'),
        'signIn' => $t::t('Sign in', 'تسجيل الدخول'),
        'expiredTitle' => $t::t('This link has expired', 'انتهت صلاحية هذا الرابط'),
        'expiredBody' => $t::t('Reset links work once and only for a short time. Ask for a new one.', 'روابط إعادة التعيين تعمل مرة واحدة ولمدة قصيرة. اطلب رابطًا جديدًا.'),
        'requestLink' => $t::t('Send a new link', 'أرسل رابطًا جديدًا'),
    ], (array) $labels);
    $policy = $rules ? (is_array($rules) ? $rules : []) : null;
    $minLength = (int) ($minPasswordLength ?? ($policy !== null ? ($policy['minLength'] ?? 12) : 8));
    $min = (string) $minLength;
    $uid = 'nq-reset-'.\Illuminate\Support\Str::random(6);
    $config = [
        'minLength' => $minLength, 'policy' => $policy !== null ? ['minLength' => $minLength, 'require' => array_values($policy['require'] ?? ['upper', 'lower', 'digit', 'symbol'])] : null,
        'state' => $state, 'names' => ['password', 'confirm'], 'fieldLabels' => ['password' => $l['password'], 'confirm' => $l['confirm']],
        'errorTitle' => $l['errorTitle'], 'failed' => $l['failed'], 'labels' => $l,
    ];
    $action = $attributes->get('action');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'reset-password-form') }}" x-data="nqResetPasswordForm(@js($config))" x-bind:data-state="state"
    {{ $attributes->except(['data-slot', 'action', 'method'])->cn('w-full') }}>
    <form novalidate x-show="state === 'idle'" @if ($state !== 'idle') style="display: none" @endif x-bind:aria-busy="pending ? 'true' : null" x-on:submit.prevent="onSubmit()" x-on:input="clear($event.target.name)"
        @if ($action) action="{{ $action }}" method="{{ $attributes->get('method', 'post') }}" @endif class="flex w-full flex-col gap-4">
        <x-nq::login-form.summary />
        <x-nq::field x-model="bad.password">
            <x-nq::field.label for="{{ $uid }}-password">{{ $l['password'] }}</x-nq::field.label>
            <x-nq::password-input id="{{ $uid }}-password" name="password" autocomplete="new-password" show-strength :rules="$policy !== null ? $policy + ['minLength' => $minLength] : null"
                aria-describedby="{{ $uid }}-password-hint {{ $uid }}-password-error" x-bind:aria-invalid="bad.password ? 'true' : null" />
            <x-nq::field.error id="{{ $uid }}-password-error"><span x-text="fe.password"></span></x-nq::field.error>
            @if ($policy === null)
                <x-nq::field.description id="{{ $uid }}-password-hint" x-show="! bad.password">{{ str_replace('{min}', $min, $l['passwordHint']) }}</x-nq::field.description>
            @endif
        </x-nq::field>
        <x-nq::field x-model="bad.confirm">
            <x-nq::field.label for="{{ $uid }}-confirm">{{ $l['confirm'] }}</x-nq::field.label>
            <x-nq::password-input id="{{ $uid }}-confirm" name="confirm" autocomplete="new-password"
                aria-describedby="{{ $uid }}-confirm-error" x-bind:aria-invalid="bad.confirm ? 'true' : null" />
            <x-nq::field.error id="{{ $uid }}-confirm-error"><span x-text="fe.confirm"></span></x-nq::field.error>
        </x-nq::field>
        <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
            <template x-if="pending"><x-nq::spinner /></template>
            {{ $l['submit'] }}
        </x-nq::button>
    </form>
    <div class="flex w-full flex-col gap-4 text-start" x-show="state !== 'idle'" @if ($state === 'idle') style="display: none" @endif>
        <div class="flex size-10 items-center justify-center rounded-full {{ $state === 'expired' ? 'bg-nq-warning-soft text-nq-warning-text' : 'bg-nq-success-soft text-nq-success-text' }}"
            x-bind:class="state === 'success' ? 'bg-nq-success-soft text-nq-success-text' : 'bg-nq-warning-soft text-nq-warning-text'">
            <x-lucide-circle-check x-show="state === 'success'" aria-hidden="true" class="size-5" :style="$state === 'expired' ? 'display: none' : ''" />
            <x-lucide-link x-show="state === 'expired'" aria-hidden="true" class="size-5" :style="$state !== 'expired' ? 'display: none' : ''" />
        </div>
        <div role="status" class="flex flex-col gap-1.5">
            <h2 data-slot="reset-password-title" tabindex="-1" class="text-h3 text-foreground outline-none" x-text="state === 'success' ? @js($l['successTitle']) : @js($l['expiredTitle'])">{{ $state === 'expired' ? $l['expiredTitle'] : $l['successTitle'] }}</h2>
            <p class="text-body-sm text-muted-foreground" x-text="state === 'success' ? @js($l['successBody']) : @js($l['expiredBody'])">{{ $state === 'expired' ? $l['expiredBody'] : $l['successBody'] }}</p>
        </div>
        @if ($signIn)
            <div class="contents" x-show="state === 'success'" @if ($state !== 'success') style="display: none" @endif>
                @if (is_string($signIn))
                    <x-nq::button variant="primary" size="lg" :href="$signIn">{{ $l['signIn'] }}</x-nq::button>
                @else
                    <x-nq::button type="button" variant="primary" size="lg" x-on:click="go('sign-in')">{{ $l['signIn'] }}</x-nq::button>
                @endif
            </div>
        @endif
        @if ($requestLink)
            <div class="contents" x-show="state === 'expired'" @if ($state !== 'expired') style="display: none" @endif>
                @if (is_string($requestLink))
                    <x-nq::button variant="primary" size="lg" :href="$requestLink">{{ $l['requestLink'] }}</x-nq::button>
                @else
                    <x-nq::button type="button" variant="primary" size="lg" x-on:click="go('request-link')">{{ $l['requestLink'] }}</x-nq::button>
                @endif
            </div>
        @endif
    </div>
</div>

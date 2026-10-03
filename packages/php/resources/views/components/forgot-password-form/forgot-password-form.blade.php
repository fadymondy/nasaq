{{-- <x-nq::forgot-password-form action="/forgot-password" x-on:nq-forgot-password="$event.detail.waitUntil(sendReset($event.detail.email))" />
     Ask for an email, then show "Check your inbox" with a resend button on a cooldown. The response never says whether the address has an
     account. Events (bubble from the root, each with detail.waitUntil(promise); resolve nothing for success or { error, fieldErrors }):
     nq-forgot-password { email } and nq-forgot-password-resend { email } (with no resend listener the resend fires nq-forgot-password again).
     With no listener and an action attribute it submits natively (field email). resend-seconds: default 30. default-email. labels: override any
     string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['defaultEmail' => '', 'resendSeconds' => 30, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'email' => $t::t('Email', 'البريد الإلكتروني'),
        'emailPlaceholder' => 'you@example.com',
        'submit' => $t::t('Send reset link', 'إرسال رابط إعادة التعيين'),
        'emailRequired' => $t::t('Enter your email address.', 'أدخل بريدك الإلكتروني.'),
        'emailInvalid' => $t::t('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.'),
        'errorTitle' => $t::t('Fix this to continue', 'صحّح هذا للمتابعة'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'sentTitle' => $t::t('Check your inbox', 'تحقق من بريدك'),
        'sentBody' => $t::t('If an account exists for {email}, we sent a link to reset the password.', 'إن كان هناك حساب مرتبط بـ {email} فقد أرسلنا رابطًا لإعادة تعيين كلمة المرور.'),
        'resend' => $t::t('Resend email', 'إعادة إرسال الرسالة'),
        'resendIn' => $t::t('Resend in {time}', 'إعادة الإرسال بعد {time}'),
        'resent' => $t::t('We sent the email again.', 'أرسلنا الرسالة مرة أخرى.'),
        'changeEmail' => $t::t('Use a different email', 'استخدام بريد آخر'),
    ], (array) $labels);
    $uid = 'nq-forgot-'.\Illuminate\Support\Str::random(6);
    $config = [
        'resendSeconds' => (int) $resendSeconds, 'names' => ['email'], 'fieldLabels' => ['email' => $l['email']],
        'errorTitle' => $l['errorTitle'], 'failed' => $l['failed'], 'labels' => $l,
    ];
    [$before, $after] = array_pad(explode('{email}', $l['sentBody'], 2), 2, '');
    $action = $attributes->get('action');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'forgot-password-form') }}" x-data="nqForgotPasswordForm(@js($config))" x-bind:data-state="sentTo ? 'sent' : 'idle'"
    {{ $attributes->except(['data-slot', 'action', 'method'])->cn('w-full') }}>
    <form novalidate x-show="! sentTo" x-bind:aria-busy="pending ? 'true' : null" x-on:submit.prevent="onSubmit()" x-on:input="clear($event.target.name)"
        @if ($action) action="{{ $action }}" method="{{ $attributes->get('method', 'post') }}" @endif class="flex w-full flex-col gap-4">
        <x-nq::login-form.summary />
        <x-nq::field name="email" x-model="bad.email">
            <x-nq::field.label for="{{ $uid }}-email">{{ $l['email'] }}</x-nq::field.label>
            <x-nq::field.input id="{{ $uid }}-email" type="email" ltr autocomplete="email" inputmode="email" value="{{ $defaultEmail }}"
                placeholder="{{ $l['emailPlaceholder'] }}" aria-describedby="{{ $uid }}-email-error" x-bind:aria-invalid="bad.email ? 'true' : null" />
            <x-nq::field.error id="{{ $uid }}-email-error"><span x-text="fe.email"></span></x-nq::field.error>
        </x-nq::field>
        <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
            <template x-if="pending"><x-nq::spinner /></template>
            {{ $l['submit'] }}
        </x-nq::button>
    </form>
    <div class="flex w-full flex-col gap-4 text-start" x-show="sentTo" style="display: none">
        <div class="flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
            <x-lucide-mail-check aria-hidden="true" class="size-5" />
        </div>
        <div role="status" class="flex flex-col gap-1.5">
            <h2 data-slot="forgot-password-sent-title" tabindex="-1" class="text-h3 text-foreground outline-none">{{ $l['sentTitle'] }}</h2>
            <p class="text-body-sm text-muted-foreground">{{ $before }}<bdi dir="ltr" class="font-medium text-foreground" x-text="sentTo"></bdi>{{ $after }}</p>
        </div>
        <x-nq::alert tone="danger" x-show="resendError" style="display: none"><span x-text="resendError"></span></x-nq::alert>
        <span role="status" class="sr-only" x-text="resendDone && cooldown > 0 ? @js($l['resent']) : ''"></span>
        <x-nq::button type="button" variant="secondary" size="lg" data-slot="forgot-password-resend" x-on:click="resend()"
            x-bind:disabled="resendOff()" x-bind:data-disabled="resendOff() ? '' : null" x-bind:aria-busy="resendPending ? 'true' : null">
            <template x-if="resendPending"><x-nq::spinner /></template>
            <span x-text="resendLabel()">{{ $l['resend'] }}</span>
        </x-nq::button>
        <x-nq::button type="button" variant="link" size="sm" class="self-start" x-on:click="changeEmail()">{{ $l['changeEmail'] }}</x-nq::button>
    </div>
</div>

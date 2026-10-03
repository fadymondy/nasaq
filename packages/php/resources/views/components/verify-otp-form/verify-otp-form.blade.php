{{-- <x-nq::verify-otp-form destination="fady@example.com" resend x-on:nq-verify-otp="$event.detail.waitUntil(verify($event.detail.code))"
         x-on:nq-verify-otp-resend="$event.detail.waitUntil(resendCode())"><x-slot:footer><a href="/login">Use a different email</a></x-slot:footer></x-nq::verify-otp-form>
     Verify an emailed or texted one-time code. A masked destination (f•••y@example.com), an OTP input that submits when the last digit lands
     (or on paste), boxes that clear and refocus on a wrong code, and a resend button on a countdown.
     Events (bubble from the form; detail.waitUntil(promise); resolve nothing for success or { error } for a wrong or expired code): nq-verify-otp { code },
     nq-verify-otp-resend {}. With no nq-verify-otp listener and an action attribute it submits natively (field code).
     destination: the address or number the code went to (masked here). channel: email | sms. length: default 6. resend: show "Resend code" (waits
     resend-seconds, default 30, before the first one). auto-submit: default true. labels: override any string. Slot footer: under the form.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['destination', 'channel' => 'email', 'length' => 6, 'resend' => false, 'resendSeconds' => 30, 'autoSubmit' => true, 'footer' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'descriptionEmail' => $t::t('Enter the {length}-digit code we sent to {destination}.', 'أدخل الرمز المكوّن من {length} أرقام الذي أرسلناه إلى {destination}.'),
        'descriptionSms' => $t::t('Enter the {length}-digit code we texted to {destination}.', 'أدخل الرمز المكوّن من {length} أرقام الذي أرسلناه برسالة نصية إلى {destination}.'),
        'group' => $t::t('Verification code', 'رمز التحقق'),
        'submit' => $t::t('Verify', 'تحقّق'),
        'noCode' => $t::t('Did not get a code?', 'لم يصلك الرمز؟'),
        'resend' => $t::t('Resend code', 'إعادة إرسال الرمز'),
        'resendIn' => $t::t('Resend in {time}', 'إعادة الإرسال بعد {time}'),
        'resent' => $t::t('We sent a new code.', 'أرسلنا رمزًا جديدًا.'),
        'incomplete' => $t::t('Enter all {length} digits.', 'أدخل الأرقام الـ {length} كاملة.'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $mask = function (string $destination, string $channel): string {
        $value = trim($destination);
        if ($channel === 'email' && str_contains($value, '@')) {
            $at = strrpos($value, '@');
            $local = substr($value, 0, $at);
            $domain = substr($value, $at);

            return mb_strlen($local) <= 2 ? mb_substr($local, 0, 1).'•••'.$domain : mb_substr($local, 0, 1).'•••'.mb_substr($local, -1).$domain;
        }
        $digits = preg_replace('/[^\d]/', '', $value);

        return str_repeat('•', max(4, strlen($digits) - 2)).substr($digits, -2);
    };
    $text = str_replace(['{length}', '{destination}'], [(string) $length, "\0"], $channel === 'sms' ? $l['descriptionSms'] : $l['descriptionEmail']);
    [$before, $after] = array_pad(explode("\0", $text, 2), 2, '');
    $uid = 'nq-otp-'.\Illuminate\Support\Str::random(6);
    $config = [
        'length' => (int) $length, 'autoSubmit' => (bool) $autoSubmit, 'resend' => (bool) $resend, 'resendSeconds' => (int) $resendSeconds,
        'names' => ['code'], 'failed' => $l['failed'], 'labels' => $l,
    ];
    $action = $attributes->get('action');
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'verify-otp-form') }}" novalidate x-data="nqVerifyOtpForm(@js($config))" x-bind:aria-busy="pending ? 'true' : null"
    x-on:submit.prevent="onSubmit()" {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-4') }}>
    <p class="text-body-sm text-muted-foreground">{{ $before }}<bdi dir="ltr" class="font-medium text-foreground">{{ $mask((string) $destination, $channel) }}</bdi>{{ $after }}</p>
    <div class="flex flex-col gap-2" x-effect="markInvalid($el)">
        <x-nq::otp-input name="code" :length="$length" autofocus aria-label="{{ $l['group'] }}" aria-describedby="{{ $uid }}-message" x-model="code"
            x-on:complete="onComplete($event.detail)" class="self-center" />
        <p id="{{ $uid }}-message" role="alert" class="text-center text-caption text-nq-danger-text" style="display: none" x-show="message()" x-text="message()"></p>
    </div>
    <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
        <template x-if="pending"><x-nq::spinner /></template>
        {{ $l['submit'] }}
    </x-nq::button>
    @if ($resend)
        <div class="flex flex-wrap items-center justify-center gap-x-1 text-body-sm text-muted-foreground">
            <span>{{ $l['noCode'] }}</span>
            <x-nq::button type="button" variant="link" size="sm" data-slot="verify-otp-resend" x-on:click="resend()"
                x-bind:disabled="resendOff()" x-bind:data-disabled="resendOff() ? '' : null" x-bind:aria-busy="resendPending ? 'true' : null">
                <template x-if="resendPending"><x-nq::spinner /></template>
                <span x-text="resendLabel()">{{ $l['resend'] }}</span>
            </x-nq::button>
        </div>
    @endif
    <span role="status" class="sr-only" x-text="resendSent ? @js($l['resent']) : ''"></span>
    @if ($footer && ! $footer->isEmpty())
        <div class="text-center text-body-sm">{{ $footer }}</div>
    @endif
</form>

{{-- <x-nq::device-pairing.entry :default-code="request('user_code')" x-on:nq-device-code="$event.detail.waitUntil(checkCode($event.detail.code))" />
     The page where someone types the code from their TV, CLI or app: boxes that take letters and digits, upper-cased, submitting on the
     last character. Boxes clear and refocus on a wrong code. Event (bubbles from the form; detail.waitUntil(promise); resolve nothing
     for success or { error } for an unknown or used code): nq-device-code { code } with the normalised code (WDJBMJHT).
     length: default 8. default-code: pre-filled code (from ?user_code=). labels: override any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['length' => 8, 'defaultCode' => '', 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'group' => $t::t('Device code', 'رمز الجهاز'),
        'submit' => $t::t('Continue', 'متابعة'),
        'incomplete' => $t::t('Enter all {length} characters.', 'أدخل الأحرف الـ {length} كاملة.'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $uid = 'nq-device-'.\Illuminate\Support\Str::random(6);
    $config = ['length' => (int) $length, 'defaultCode' => (string) $defaultCode, 'names' => ['code'], 'failed' => $l['failed'], 'labels' => $l];
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'device-code-entry') }}" novalidate x-data="nqDeviceCodeEntry(@js($config))" x-bind:aria-busy="pending ? 'true' : null"
    x-on:submit.prevent="onSubmit()" {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-4') }}>
    <div class="flex flex-col gap-4" x-effect="markInvalid($el)">
        <x-nq::otp-input name="code" type="alphanumeric" :length="$length" :value="$defaultCode" autofocus aria-label="{{ $l['group'] }}" aria-describedby="{{ $uid }}-message" x-model="code"
            x-on:complete="onComplete($event.detail)" class="self-center uppercase" />
        <p id="{{ $uid }}-message" role="alert" class="text-center text-caption text-nq-danger-text" style="display: none" x-show="message()" x-text="message()"></p>
    </div>
    <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
        <template x-if="pending"><x-nq::spinner /></template>
        {{ $l['submit'] }}
    </x-nq::button>
</form>

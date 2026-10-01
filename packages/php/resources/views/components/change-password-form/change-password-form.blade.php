{{-- <x-nq::change-password-form action="/password" x-on:nq-change-password="$event.detail.waitUntil(save($event.detail))" />
     Change the password of the signed-in account: current, new (with the strength meter) and confirm, plus an option to sign out other sessions.
     It validates in the browser (required, too short, same as current, mismatch), then hands the values to you:
     listen for nq-change-password on it ({ currentPassword, newPassword, signOutOthers, waitUntil(promise) }). Resolve nothing for success
     (the fields clear and a confirmation shows), or { error: "…", fieldErrors: { currentPassword: "…" } } to show messages (a wrong current
     password goes in fieldErrors.currentPassword); a rejection shows the generic error. With no listener and an action attribute it submits
     the form natively (fields named currentPassword, newPassword, confirmPassword, signOutOthers), so a plain Laravel form works.
     min-length: of the new password (default 8). show-sign-out-others: the checkbox (default true). default-sign-out-others: its start state (default true).
     labels: an array overriding any built-in string (current, next, nextHint, confirm, signOutOthers, signOutOthersHint, submit, success,
     required, tooShort (use {n}), mismatch, same, genericError).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['minLength' => 8, 'showSignOutOthers' => true, 'defaultSignOutOthers' => true, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'current' => $t::t('Current password', 'كلمة المرور الحالية'),
        'next' => $t::t('New password', 'كلمة المرور الجديدة'),
        'nextHint' => $t::t('At least 8 characters.', '8 أحرف على الأقل.'),
        'confirm' => $t::t('Confirm new password', 'تأكيد كلمة المرور الجديدة'),
        'signOutOthers' => $t::t('Sign out of all other sessions', 'تسجيل الخروج من كل الجلسات الأخرى'),
        'signOutOthersHint' => $t::t('Recommended if you think someone else knows your old password.', 'يُنصح بذلك إذا كنت تظن أن أحدًا يعرف كلمة المرور القديمة.'),
        'submit' => $t::t('Change password', 'تغيير كلمة المرور'),
        'success' => $t::t('Your password was changed.', 'تم تغيير كلمة المرور.'),
        'required' => $t::t('Enter this to continue.', 'أدخل هذا الحقل للمتابعة.'),
        'tooShort' => $t::t('Use at least {n} characters.', 'استخدم {n} أحرف على الأقل.'),
        'mismatch' => $t::t('The passwords do not match.', 'كلمتا المرور غير متطابقتين.'),
        'same' => $t::t('Choose a password different from your current one.', 'اختر كلمة مرور مختلفة عن الحالية.'),
        'genericError' => $t::t('Could not change your password. Try again.', 'تعذر تغيير كلمة المرور. حاول مرة أخرى.'),
    ], (array) $labels);
    $uid = 'nq-cpw-'.substr(md5(json_encode($l).$minLength), 0, 6);
    $config = ['minLength' => (int) $minLength, 'showSignOutOthers' => (bool) $showSignOutOthers, 'labels' => $l];
@endphp
<form data-slot="change-password-form" novalidate x-data="nqChangePasswordForm(@js($config))" x-on:submit.prevent="submit()"
    {{ $attributes->cn('flex w-full max-w-md flex-col gap-4') }}>
    <x-nq::alert tone="success" x-show="done" style="display: none">{{ $l['success'] }}</x-nq::alert>
    <x-nq::alert tone="danger" x-show="formError" style="display: none"><span x-text="formError"></span></x-nq::alert>
    <x-nq::field x-model="bad.currentPassword">
        <x-nq::field.label for="{{ $uid }}-current">{{ $l['current'] }}</x-nq::field.label>
        <x-nq::password-input id="{{ $uid }}-current" name="currentPassword" autocomplete="current-password" required
            aria-describedby="{{ $uid }}-current-error" x-bind:disabled="pending" x-bind:aria-invalid="bad.currentPassword ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-current-error"><span x-text="errors.currentPassword"></span></x-nq::field.error>
    </x-nq::field>
    <x-nq::field x-model="bad.newPassword">
        <x-nq::field.label for="{{ $uid }}-next">{{ $l['next'] }}</x-nq::field.label>
        <x-nq::password-input id="{{ $uid }}-next" name="newPassword" autocomplete="new-password" minlength="{{ $minLength }}" required show-strength
            aria-describedby="{{ $uid }}-next-hint {{ $uid }}-next-error" x-bind:disabled="pending" x-bind:aria-invalid="bad.newPassword ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-next-error"><span x-text="errors.newPassword"></span></x-nq::field.error>
        <x-nq::field.description id="{{ $uid }}-next-hint" x-show="! bad.newPassword">{{ $l['nextHint'] }}</x-nq::field.description>
    </x-nq::field>
    <x-nq::field x-model="bad.confirmPassword">
        <x-nq::field.label for="{{ $uid }}-confirm">{{ $l['confirm'] }}</x-nq::field.label>
        <x-nq::password-input id="{{ $uid }}-confirm" name="confirmPassword" autocomplete="new-password" required
            aria-describedby="{{ $uid }}-confirm-error" x-bind:disabled="pending" x-bind:aria-invalid="bad.confirmPassword ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-confirm-error"><span x-text="errors.confirmPassword"></span></x-nq::field.error>
    </x-nq::field>
    @if ($showSignOutOthers)
        <div class="flex items-start gap-2">
            <x-nq::checkbox id="{{ $uid }}-check" name="signOutOthers" value="1" :checked="(bool) $defaultSignOutOthers" x-model="signOutOthers" class="mt-0.5"
                x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" />
            <div class="flex flex-col gap-0.5">
                <label for="{{ $uid }}-check" class="text-body-sm text-foreground">{{ $l['signOutOthers'] }}</label>
                <p class="text-caption text-muted-foreground">{{ $l['signOutOthersHint'] }}</p>
            </div>
        </div>
    @endif
    <div>
        <x-nq::button type="submit" variant="primary" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
            <template x-if="pending"><x-nq::spinner /></template>
            {{ $l['submit'] }}
        </x-nq::button>
    </div>
</form>

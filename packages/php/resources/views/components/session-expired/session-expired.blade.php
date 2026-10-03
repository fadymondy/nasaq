{{-- <x-nq::session-expired :user="['name' => 'Nour Adel', 'email' => 'nour@example.com']" passkey switch-account sign-out
         x-on:nq-session-expired="$event.detail.waitUntil(reauth($event.detail))" />
     The re-authentication screen for a session that ended: the same person, one password (and code) or a passkey away from continuing. Put it in an
     auth-layout, like the other auth forms. It verifies nothing itself: your listener does. Use lock-screen for a session that is still valid but locked.
     user: ['name', 'email', 'avatar'] (who was signed in; the email is not asked again). reason: expired | revoked | password-changed (default expired).
     require-code: ask for an authenticator code with the password. passkey: the passkey button (shown when the browser supports WebAuthn).
     switch-account / sign-out: render those link buttons. keeps-work: tell people their unsaved work is safe. Slot: footer. labels: override any string.
     Events (bubble from the form; detail.waitUntil(promise); resolve nothing once the session is back, or { error, fieldErrors } (keys password, code)):
     nq-session-expired { password, code }, nq-passkey, nq-session-switch-account, nq-session-sign-out. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['user', 'reason' => 'expired', 'requireCode' => false, 'passkey' => false, 'switchAccount' => false, 'signOut' => false, 'keepsWork' => false, 'footer' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'expired' => $t::t('Your session expired', 'انتهت جلستك'),
        'expiredHint' => $t::t('For your security we signed you out after a while. Sign in again to pick up where you left off.', 'لأمانك سجّلنا خروجك بعد فترة. سجّل الدخول مرة أخرى لتكمل من حيث توقفت.'),
        'revoked' => $t::t('You were signed out', 'تم تسجيل خروجك'),
        'revokedHint' => $t::t('This session was ended from another device or by an admin. Sign in again to continue.', 'أُنهيت هذه الجلسة من جهاز آخر أو بواسطة مسؤول. سجّل الدخول مرة أخرى للمتابعة.'),
        'passwordChanged' => $t::t('Your password changed', 'تغيّرت كلمة مرورك'),
        'passwordChangedHint' => $t::t('Sign in with your new password to continue.', 'سجّل الدخول بكلمة المرور الجديدة للمتابعة.'),
        'password' => $t::t('Password', 'كلمة المرور'),
        'passwordRequired' => $t::t('Enter your password.', 'أدخل كلمة المرور.'),
        'codeLabel' => $t::t('Authenticator code', 'رمز تطبيق المصادقة'),
        'codeRequired' => $t::t('Enter all 6 digits of the code.', 'أدخل الأرقام الـ 6 كاملة للرمز.'),
        'box' => $t::t('Digit {index} of 6', 'الخانة {index} من 6'),
        'submit' => $t::t('Sign in again', 'سجّل الدخول مرة أخرى'),
        'passkey' => $t::t('Use a passkey', 'استخدم مفتاح المرور'),
        'switchAccount' => $t::t('Use a different account', 'استخدم حسابًا آخر'),
        'signOut' => $t::t('Sign out', 'تسجيل الخروج'),
        'errorTitle' => $t::t('Fix these to continue', 'أصلح هذه الحقول للمتابعة'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'lostWork' => $t::t('Your unsaved changes are kept in this tab.', 'تغييراتك غير المحفوظة محفوظة في هذا التبويب.'),
    ], (array) $labels);
    $reason = in_array($reason, ['expired', 'revoked', 'password-changed'], true) ? $reason : 'expired';
    $key = $reason === 'password-changed' ? 'passwordChanged' : $reason;
    $uid = 'nq-session-'.\Illuminate\Support\Str::random(6);
    $config = [
        'requireCode' => (bool) $requireCode, 'passkey' => (bool) $passkey, 'names' => ['password', 'code'],
        'fieldLabels' => ['password' => $l['password'], 'code' => $l['codeLabel']], 'errorTitle' => $l['errorTitle'], 'failed' => $l['failed'],
        'labels' => array_intersect_key($l, array_flip(['passwordRequired', 'codeRequired', 'failed'])),
    ];
    $has = fn ($s) => $s && ! $s->isEmpty();
@endphp
<form novalidate data-slot="{{ $attributes->get('data-slot', 'session-expired') }}" data-reason="{{ $reason }}" x-data="nqSessionExpired(@js($config))"
    x-bind:aria-busy="pending ? 'true' : null" x-on:submit.prevent="onSubmit()" x-on:input="clear($event.target.name)"
    {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-4') }}>
    <x-nq::alert tone="warning" icon="clock" :title="$l[$key]">
        {{ $l[$key.'Hint'] }}
        @if ($keepsWork) <span class="mt-1 block">{{ $l['lostWork'] }}</span> @endif
    </x-nq::alert>

    <div data-slot="session-expired-user" class="flex items-center gap-3 rounded-control border border-border bg-muted/50 p-3">
        <x-nq::avatar :name="$user['name'] ?? ''" :src="$user['avatar'] ?? null" />
        <div class="flex min-w-0 flex-col text-start">
            <span class="truncate text-label text-foreground">{{ $user['name'] ?? '' }}</span>
            @if (! empty($user['email'])) <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ $user['email'] }}</bdi> @endif
        </div>
    </div>

    <x-nq::login-form.summary />
    {{-- The account is already known: a hidden username lets password managers fill the right entry. --}}
    <input type="text" name="username" autocomplete="username" value="{{ $user['email'] ?? ($user['name'] ?? '') }}" readonly hidden />
    <x-nq::field x-model="bad.password">
        <x-nq::field.label for="{{ $uid }}-password">{{ $l['password'] }}</x-nq::field.label>
        <x-nq::password-input id="{{ $uid }}-password" name="password" autofocus autocomplete="current-password" aria-describedby="{{ $uid }}-password-error"
            x-bind:aria-invalid="bad.password ? 'true' : null" />
        <x-nq::field.error id="{{ $uid }}-password-error"><span x-text="fe.password"></span></x-nq::field.error>
    </x-nq::field>
    @if ($requireCode)
        <div class="flex flex-col gap-2">
            <span class="text-label text-foreground">{{ $l['codeLabel'] }}</span>
            <x-nq::otp-input name="code" :length="6" aria-label="{{ $l['codeLabel'] }}" />
        </div>
    @endif
    <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="pending || passkeyPending" x-bind:data-disabled="pending || passkeyPending ? '' : null"
        x-bind:aria-busy="pending ? 'true' : null">
        <template x-if="pending"><x-nq::spinner /></template>
        {{ $l['submit'] }}
    </x-nq::button>
    @if ($passkey)
        <x-nq::button type="button" variant="secondary" size="lg" data-slot="session-expired-passkey" style="display: none" x-show="passkeyOn" x-on:click="passkey()"
            x-bind:disabled="pending || passkeyPending" x-bind:data-disabled="pending || passkeyPending ? '' : null" x-bind:aria-busy="passkeyPending ? 'true' : null">
            <template x-if="passkeyPending"><x-nq::spinner /></template>
            <x-lucide-key-round aria-hidden="true" />
            {{ $l['passkey'] }}
        </x-nq::button>
    @endif
    @if ($switchAccount || $signOut)
        <div class="flex flex-wrap items-center justify-between gap-2">
            @if ($switchAccount)
                <x-nq::button type="button" variant="link" size="sm" x-on:click="switchAccount()" x-bind:disabled="busyAny()" x-bind:data-disabled="busyAny() ? '' : null">{{ $l['switchAccount'] }}</x-nq::button>
            @else
                <span></span>
            @endif
            @if ($signOut)
                <x-nq::button type="button" variant="link" size="sm" x-on:click="signOut()" x-bind:disabled="busyAny()" x-bind:data-disabled="busyAny() ? '' : null">{{ $l['signOut'] }}</x-nq::button>
            @endif
        </div>
    @endif
    @if ($has($footer)) {{ $footer }} @endif
</form>

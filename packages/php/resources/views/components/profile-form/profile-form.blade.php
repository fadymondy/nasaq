{{-- <x-nq::profile-form :values="['name' => 'Sara', 'username' => 'sara', 'email' => 'sara@x.com', 'phone' => '+966501234567', 'bio' => '', 'locale' => 'en', 'timezone' => 'Asia/Riyadh']"
         check-username @save="$event.detail.wait(update($event.detail.values))" />
     The "Profile" settings form, laid out like the public profile page: an identity column with the photo and a live preview, beside grouped fields:
     Public profile (display name, username with a live availability check, bio, optional location and website), Account (email with verification and a
     password-protected change, phone) and Preferences (language, time zone). A sticky Save / Discard bar shows only while something differs from the saved
     values. Needs the Alpine runtime (@nasaqScripts).
     values: ['name', 'username', 'email', 'phone' (E.164), 'bio', 'locale', 'timezone', 'location', 'website']; include location / website (even '') to show those fields.
     has-avatar (false): shows the photo upload (nq-avatar-change / nq-avatar-remove of avatar-upload bubble to you); avatar-src is the saved photo.
     check-username (false): true fires check-username after typing pauses (username-debounce, default 400 ms).
     email-verified: true / false shows the Verified / Not verified badge. has-resend (false): the resend link when not verified. has-change-email (false): the Change email dialog.
     languages: ['en' => 'English', …] (default English and Arabic). timezones: ['Asia/Riyadh' => 'Riyadh (GMT+3)', …] (default every PHP zone). bio-max-length (160). default-country ('SA'). profile-href. disabled. labels: any string below, by key.
     It fires events on the root with detail { …, wait(promise) }; resolve, or resolve { error, fieldErrors } to show a failure:
       save                 detail.values { name, username, email, phone, bio, locale, timezone, location, website }
       check-username       detail.username; resolve true / false / { available, message }. Nobody listening means no check.
       resend-verification  (no detail); resolve when sent
       change-email         detail { email, password }; fieldErrors may carry email / password
     A rejected promise, or nobody listening, shows the generic error. After a save the form treats the new values as saved. --}}
@props(['values' => [], 'hasAvatar' => false, 'avatarSrc' => null, 'checkUsername' => false, 'usernameDebounce' => 400, 'emailVerified' => null, 'hasResend' => false, 'hasChangeEmail' => false, 'languages' => null, 'timezones' => null, 'bioMaxLength' => 160, 'defaultCountry' => 'SA', 'profileHref' => null, 'disabled' => false, 'labels' => []])
@php
    $S = [
        'en' => [
            'name' => 'Display name',
            'nameHelp' => 'Shown on your profile and next to your activity.',
            'nameRequired' => 'Enter your name.',
            'username' => 'Username',
            'usernameHelp' => '3 to 30 letters, numbers, dots, dashes or underscores.',
            'usernameFormat' => 'Use 3 to 30 letters, numbers, dots, dashes or underscores. Start and end with a letter or number.',
            'usernameChecking' => 'Checking availability',
            'usernameAvailable' => '⁦{x}⁩ is available.',
            'usernameTaken' => 'That username is taken. Try another one.',
            'usernameCheckFailed' => 'Availability could not be checked. It will be verified when you save.',
            'email' => 'Email',
            'emailHelp' => 'Used to sign in and for account notices.',
            'verified' => 'Verified',
            'unverified' => 'Not verified',
            'resend' => 'Resend verification email',
            'resending' => 'Sending',
            'resent' => 'Verification email sent to ⁦{x}⁩.',
            'resendFailed' => 'The email could not be sent. Try again.',
            'changeEmail' => 'Change email',
            'changeEmailTitle' => 'Change your email',
            'changeEmailDescription' => 'We send a confirmation link to the new address. Enter your password to continue.',
            'newEmail' => 'New email',
            'emailInvalid' => 'Enter a valid email address.',
            'emailSame' => 'That is already your email.',
            'currentPassword' => 'Current password',
            'passwordRequired' => 'Enter your password.',
            'sendConfirmation' => 'Send confirmation link',
            'changeEmailFailed' => 'Your email could not be changed. Try again.',
            'pendingEmail' => 'We sent a confirmation link to ⁦{x}⁩. Your email changes once you confirm it.',
            'phone' => 'Phone',
            'phoneHelp' => 'Used to recover your account. Never shown to others.',
            'bio' => 'Bio',
            'bioHelp' => 'A short line about you.',
            'language' => 'Language',
            'timezone' => 'Time zone',
            'timezoneSearch' => 'Search time zones',
            'timezoneEmpty' => 'No time zone found.',
            'clear' => 'Clear',
            'open' => 'Open list',
            'unsaved' => 'You have unsaved changes',
            'discard' => 'Discard',
            'save' => 'Save changes',
            'cancel' => 'Cancel',
            'saved' => 'Profile updated.',
            'saveFailed' => 'Your profile could not be saved. Try again.',
            'dismiss' => 'Dismiss',
            'publicProfile' => 'Public profile',
            'publicProfileHint' => 'Everyone can see this on your profile page.',
            'account' => 'Account',
            'accountHint' => 'Private. Used to sign in and to recover your account.',
            'preferences' => 'Preferences',
            'preferencesHint' => 'How dates, times and the interface are shown to you.',
            'location' => 'Location',
            'locationHelp' => 'City and country, as you want it shown.',
            'website' => 'Website',
            'websiteHelp' => 'Your site or portfolio.',
            'websiteInvalid' => 'Enter a full link that starts with https://.',
            'viewProfile' => 'View public profile',
            'preview' => 'Profile preview',
        ],
        'ar' => [
            'name' => 'الاسم المعروض',
            'nameHelp' => 'يظهر في ملفك الشخصي وبجانب نشاطك.',
            'nameRequired' => 'أدخل اسمك.',
            'username' => 'اسم المستخدم',
            'usernameHelp' => 'من 3 إلى 30 حرفًا أو رقمًا أو نقطة أو شرطة أو شرطة سفلية.',
            'usernameFormat' => 'استخدم من 3 إلى 30 حرفًا أو رقمًا أو نقطة أو شرطة أو شرطة سفلية، وابدأ وانتهِ بحرف أو رقم.',
            'usernameChecking' => 'جارٍ التحقق من التوفر',
            'usernameAvailable' => '⁦{x}⁩ متاح.',
            'usernameTaken' => 'اسم المستخدم هذا مستخدم بالفعل. جرّب اسمًا آخر.',
            'usernameCheckFailed' => 'تعذّر التحقق من التوفر. سيتم التحقق منه عند الحفظ.',
            'email' => 'البريد الإلكتروني',
            'emailHelp' => 'يُستخدم لتسجيل الدخول وإشعارات الحساب.',
            'verified' => 'موثّق',
            'unverified' => 'غير موثّق',
            'resend' => 'إعادة إرسال رسالة التوثيق',
            'resending' => 'جارٍ الإرسال',
            'resent' => 'أُرسلت رسالة التوثيق إلى ⁦{x}⁩.',
            'resendFailed' => 'تعذّر إرسال الرسالة. حاول مرة أخرى.',
            'changeEmail' => 'تغيير البريد',
            'changeEmailTitle' => 'تغيير بريدك الإلكتروني',
            'changeEmailDescription' => 'نرسل رابط تأكيد إلى العنوان الجديد. أدخل كلمة المرور للمتابعة.',
            'newEmail' => 'البريد الجديد',
            'emailInvalid' => 'أدخل بريدًا إلكترونيًا صحيحًا.',
            'emailSame' => 'هذا هو بريدك الحالي بالفعل.',
            'currentPassword' => 'كلمة المرور الحالية',
            'passwordRequired' => 'أدخل كلمة المرور.',
            'sendConfirmation' => 'إرسال رابط التأكيد',
            'changeEmailFailed' => 'تعذّر تغيير بريدك. حاول مرة أخرى.',
            'pendingEmail' => 'أرسلنا رابط تأكيد إلى ⁦{x}⁩. يتغير بريدك بعد أن تؤكده.',
            'phone' => 'الهاتف',
            'phoneHelp' => 'يُستخدم لاستعادة حسابك. لا يظهر للآخرين.',
            'bio' => 'نبذة',
            'bioHelp' => 'سطر قصير عنك.',
            'language' => 'اللغة',
            'timezone' => 'المنطقة الزمنية',
            'timezoneSearch' => 'ابحث عن منطقة زمنية',
            'timezoneEmpty' => 'لا توجد منطقة زمنية مطابقة.',
            'clear' => 'مسح',
            'open' => 'فتح القائمة',
            'unsaved' => 'لديك تغييرات غير محفوظة',
            'discard' => 'تجاهل',
            'save' => 'حفظ التغييرات',
            'cancel' => 'إلغاء',
            'saved' => 'تم تحديث الملف الشخصي.',
            'saveFailed' => 'تعذّر حفظ ملفك الشخصي. حاول مرة أخرى.',
            'dismiss' => 'تجاهل',
            'publicProfile' => 'الملف العام',
            'publicProfileHint' => 'يراه الجميع في صفحة ملفك الشخصي.',
            'account' => 'الحساب',
            'accountHint' => 'خاص. يُستخدم لتسجيل الدخول واستعادة حسابك.',
            'preferences' => 'التفضيلات',
            'preferencesHint' => 'كيف تظهر لك التواريخ والأوقات والواجهة.',
            'location' => 'الموقع',
            'locationHelp' => 'المدينة والبلد، كما تريد أن يظهرا.',
            'website' => 'الموقع الإلكتروني',
            'websiteHelp' => 'موقعك أو معرض أعمالك.',
            'websiteInvalid' => 'أدخل رابطًا كاملًا يبدأ بـ https://.',
            'viewProfile' => 'عرض الملف العام',
            'preview' => 'معاينة الملف',
        ],
    ];
    $L = fn (string $key) => $labels[$key] ?? \Nasaq\Nasaq::t($S['en'][$key], $S['ar'][$key]);
    $keys = array_keys($S['en']);
    $strings = [];
    foreach ($keys as $k) { $strings[$k] = $L($k); }
    $v = array_merge(['name' => '', 'username' => '', 'email' => '', 'phone' => '', 'bio' => '', 'locale' => 'en', 'timezone' => '', 'location' => '', 'website' => ''], $values);
    $hasLocation = array_key_exists('location', $values);
    $hasWebsite = array_key_exists('website', $values);
    $languages ??= ['en' => 'English', 'ar' => 'العربية'];
    if ($timezones === null) {
        $now = new \DateTimeImmutable('now');
        $timezones = [];
        foreach (\DateTimeZone::listIdentifiers() as $id) {
            $off = (new \DateTimeZone($id))->getOffset($now);
            $sign = $off < 0 ? '-' : '+';
            $abs = abs($off);
            $gmt = 'GMT'.$sign.intdiv($abs, 3600).($abs % 3600 ? ':'.str_pad((string) intdiv($abs % 3600, 60), 2, '0', STR_PAD_LEFT) : '');
            $timezones[$id] = str_replace(['_', '/'], [' ', ' / '], $id).' ('.$gmt.')';
        }
    }
    if ($v['timezone'] !== '' && ! isset($timezones[$v['timezone']])) { $timezones = [$v['timezone'] => $v['timezone']] + $timezones; }
    $config = [
        'values' => $v, 'hasLocation' => $hasLocation, 'hasWebsite' => $hasWebsite, 'hasCheck' => (bool) $checkUsername, 'debounce' => (int) $usernameDebounce,
        'bioMax' => (int) $bioMaxLength, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 'emailVerified' => $emailVerified, 'labels' => $strings,
    ];
    $siteInit = preg_replace('#/$#', '', preg_replace('#^https?://(www\.)?#i', '', trim((string) $v['website'])));
    $group = 'flex flex-col gap-5 rounded-card border border-border bg-card p-4 @xl:p-6';
    $grid = 'grid grid-cols-1 gap-x-4 gap-y-5 @xl:grid-cols-2';
    $dis = $disabled ? 'true' : 'false';
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'profile-form') }}" novalidate x-data="nqProfileForm(@js($config))" x-on:submit.prevent="save()" x-bind:aria-busy="saving ? 'true' : null"
    {{ $attributes->except('data-slot')->cn('@container flex flex-col gap-6') }}>
    <template x-if="formError !== null">
        <x-nq::alert tone="danger" dismissible :dismiss-label="$strings['dismiss']" x-on:nq:dismiss="formError = null"><span x-text="formError"></span></x-nq::alert>
    </template>
    <template x-if="notice !== null && ! dirty">
        <x-nq::alert tone="success" dismissible :dismiss-label="$strings['dismiss']" x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
    </template>

    <div class="grid grid-cols-1 gap-8 @3xl:grid-cols-[16rem_minmax(0,1fr)] @3xl:gap-10">
        <aside aria-label="{{ $strings['preview'] }}" data-slot="profile-form-preview" class="flex min-w-0 flex-col gap-4 @3xl:sticky @3xl:top-6 @3xl:self-start">
            @if ($hasAvatar)
                <x-nq::avatar-upload layout="stacked" :name="$v['name']" :src="$avatarSrc" :disabled="$disabled" />
            @else
                <x-nq::avatar :name="$v['name']" :src="$avatarSrc" class="size-32 text-h1 ring-1 ring-border @3xl:size-56 @3xl:text-display" />
            @endif
            <div class="flex min-w-0 flex-col gap-1">
                <p dir="auto" class="truncate text-h2 text-foreground" x-text="shownName">{{ trim($v['name']) }}</p>
                <p dir="ltr" class="truncate text-start font-mono text-body-sm text-muted-foreground" x-show="username !== ''" @if ($v['username'] === '') style="display: none" @endif x-text="'@' + username">{{ '@'.$v['username'] }}</p>
            </div>
            <ul class="flex list-none flex-col gap-2 p-0 text-body-sm text-foreground" x-show="location.trim() !== '' || site !== ''" @if (trim((string) $v['location']) === '' && $siteInit === '') style="display: none" @endif>
                <li class="flex min-w-0 items-center gap-2" x-show="location.trim() !== ''" @if (trim((string) $v['location']) === '') style="display: none" @endif>
                    <x-lucide-map-pin aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                    <bdi class="truncate" x-text="location.trim()">{{ trim((string) $v['location']) }}</bdi>
                </li>
                <li class="flex min-w-0 items-center gap-2" x-show="site !== ''" @if ($siteInit === '') style="display: none" @endif>
                    <x-lucide-globe aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                    <span dir="ltr" class="truncate" x-text="site">{{ $siteInit }}</span>
                </li>
            </ul>
            @if ($profileHref)
                <x-nq::button as="a" variant="secondary" class="w-full" :href="$profileHref">{{ $strings['viewProfile'] }}<x-lucide-external-link aria-hidden="true" /></x-nq::button>
            @endif
            <div x-show="bio.trim() !== ''" class="flex flex-col gap-4" @if (trim($v['bio']) === '') style="display: none" @endif>
                <x-nq::separator />
                <p dir="auto" class="whitespace-pre-line text-pretty text-body-sm text-nq-fg-body" x-text="bio.trim()">{{ trim($v['bio']) }}</p>
            </div>
        </aside>

        <div class="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="pf-public" data-slot="profile-form-group" class="{{ $group }}">
                <div class="flex flex-col gap-1">
                    <h3 id="pf-public" class="text-h3 text-foreground">{{ $strings['publicProfile'] }}</h3>
                    <p class="text-body-sm text-muted-foreground">{{ $strings['publicProfileHint'] }}</p>
                </div>
                <div class="{{ $grid }}">
                    <x-nq::field name="name" x-model="bad.name">
                        <x-nq::field.label>{{ $strings['name'] }}</x-nq::field.label>
                        <x-nq::field.input autocomplete="name" required x-model="name" x-bind:disabled="{{ $dis }}" />
                        <x-nq::field.error><span x-text="errs.name"></span></x-nq::field.error>
                        <x-nq::field.description x-show="! bad.name">{{ $strings['nameHelp'] }}</x-nq::field.description>
                    </x-nq::field>

                    <x-nq::field x-model="bad.username">
                        <x-nq::field.label>{{ $strings['username'] }}</x-nq::field.label>
                        <x-nq::input-group dir="ltr">
                            <x-nq::input-group.addon><x-nq::input-group.text>@</x-nq::input-group.text></x-nq::input-group.addon>
                            <x-nq::input-group.input ltr name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="30" x-model="username" x-bind:disabled="{{ $dis }}" />
                            <x-nq::input-group.addon align="end" x-show="check.status === 'idle' || check.status === 'error' ? false : true" style="display: none">
                                <template x-if="check.status === 'checking'"><x-nq::spinner class="size-4" /></template>
                                <template x-if="check.status === 'available'"><x-lucide-circle-check aria-hidden="true" class="size-4 text-nq-success-text" /></template>
                                <template x-if="check.status === 'taken'"><x-lucide-circle-x aria-hidden="true" class="size-4 text-nq-danger-text" /></template>
                            </x-nq::input-group.addon>
                        </x-nq::input-group>
                        <x-nq::field.error><span x-text="errs.username"></span></x-nq::field.error>
                        <p x-show="! bad.username" data-slot="field-description" aria-live="polite" class="text-caption text-muted-foreground" x-bind:class="check.status === 'available' ? 'text-nq-success-text' : ''" x-text="hint">{{ $strings['usernameHelp'] }}</p>
                    </x-nq::field>
                </div>

                <x-nq::field name="bio" x-model="bad.bio">
                    <x-nq::field.label>{{ $strings['bio'] }}</x-nq::field.label>
                    <x-nq::field.textarea autocomplete="off" rows="3" maxlength="{{ (int) $bioMaxLength }}" x-model="bio" x-bind:disabled="{{ $dis }}" />
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <x-nq::field.error><span x-text="errs.bio"></span></x-nq::field.error>
                            <x-nq::field.description x-show="! bad.bio">{{ $strings['bioHelp'] }}</x-nq::field.description>
                        </div>
                        <span data-slot="profile-form-counter" dir="ltr" class="shrink-0 text-caption text-muted-foreground tabular-nums" x-text="counter">{{ mb_strlen($v['bio']) }}/{{ (int) $bioMaxLength }}</span>
                    </div>
                </x-nq::field>

                @if ($hasLocation || $hasWebsite)
                    <div class="{{ $grid }}">
                        @if ($hasLocation)
                            <x-nq::field name="location" x-model="bad.location">
                                <x-nq::field.label>{{ $strings['location'] }}</x-nq::field.label>
                                <x-nq::field.input autocomplete="address-level2" x-model="location" x-bind:disabled="{{ $dis }}" />
                                <x-nq::field.error><span x-text="errs.location"></span></x-nq::field.error>
                                <x-nq::field.description x-show="! bad.location">{{ $strings['locationHelp'] }}</x-nq::field.description>
                            </x-nq::field>
                        @endif
                        @if ($hasWebsite)
                            <x-nq::field name="website" x-model="bad.website">
                                <x-nq::field.label>{{ $strings['website'] }}</x-nq::field.label>
                                <x-nq::field.input dir="ltr" type="url" autocomplete="url" inputmode="url" spellcheck="false" placeholder="https://" x-model="website" x-bind:disabled="{{ $dis }}" />
                                <x-nq::field.error><span x-text="errs.website"></span></x-nq::field.error>
                                <x-nq::field.description x-show="! bad.website">{{ $strings['websiteHelp'] }}</x-nq::field.description>
                            </x-nq::field>
                        @endif
                    </div>
                @endif
            </section>

            <section aria-labelledby="pf-account" data-slot="profile-form-group" class="{{ $group }}">
                <div class="flex flex-col gap-1">
                    <h3 id="pf-account" class="text-h3 text-foreground">{{ $strings['account'] }}</h3>
                    <p class="text-body-sm text-muted-foreground">{{ $strings['accountHint'] }}</p>
                </div>
                <x-nq::field name="email" :disabled="$disabled">
                    <div class="flex flex-wrap items-center gap-2">
                        <x-nq::field.label>{{ $strings['email'] }}</x-nq::field.label>
                        @if ($emailVerified === true)
                            <x-nq::badge variant="success"><x-lucide-circle-check aria-hidden="true" />{{ $strings['verified'] }}</x-nq::badge>
                        @elseif ($emailVerified === false)
                            <x-nq::badge variant="warning"><x-lucide-triangle-alert aria-hidden="true" />{{ $strings['unverified'] }}</x-nq::badge>
                        @endif
                    </div>
                    <x-nq::field.input dir="ltr" readonly type="email" autocomplete="email" :value="$v['email']" />
                    <x-nq::field.description>{{ $strings['emailHelp'] }}</x-nq::field.description>
                    @if ($emailVerified === false && $hasResend)
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <x-nq::button type="button" variant="link" x-on:click="resendVerification()" x-bind:aria-busy="resend === 'sending' ? 'true' : null" x-bind:data-disabled="resend === 'sent' ? '' : null" x-bind:disabled="resend === 'sent'">
                                <x-nq::spinner x-show="resend === 'sending'" style="display: none" />
                                <span x-text="resend === 'sending' ? @js($strings['resending']) : @js($strings['resend'])">{{ $strings['resend'] }}</span>
                            </x-nq::button>
                            <span aria-live="polite" class="text-caption" x-bind:class="resend === 'failed' ? 'text-nq-danger-text' : 'text-nq-success-text'" x-text="resendMsg"></span>
                        </div>
                    @endif
                    <template x-if="pendingEmail !== null">
                        <x-nq::alert tone="info"><span x-text="@js($strings['pendingEmail']).replace('{x}', pendingEmail)"></span></x-nq::alert>
                    </template>
                    @if ($hasChangeEmail)
                        <div>
                            <x-nq::button type="button" variant="secondary" size="sm" :disabled="$disabled" x-on:click="emailOpen = true">{{ $strings['changeEmail'] }}</x-nq::button>
                            <x-nq::dialog x-model="emailOpen">
                                <x-nq::dialog.content>
                                    <form novalidate class="grid gap-4" x-on:submit.prevent.stop="submitEmail()">
                                        <x-nq::dialog.header>
                                            <x-nq::dialog.title>{{ $strings['changeEmailTitle'] }}</x-nq::dialog.title>
                                            <x-nq::dialog.description>{{ $strings['changeEmailDescription'] }}</x-nq::dialog.description>
                                        </x-nq::dialog.header>
                                        <template x-if="emailError !== null">
                                            <x-nq::alert tone="danger" role="alert"><span x-text="emailError"></span></x-nq::alert>
                                        </template>
                                        <x-nq::field name="new-email" x-model="emailErrors.email">
                                            <x-nq::field.label>{{ $strings['newEmail'] }}</x-nq::field.label>
                                            <x-nq::field.input dir="ltr" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" x-model="newEmail" />
                                            <x-nq::field.error><span x-text="emailErrors.email"></span></x-nq::field.error>
                                        </x-nq::field>
                                        <x-nq::field x-model="emailErrors.password">
                                            <x-nq::field.label>{{ $strings['currentPassword'] }}</x-nq::field.label>
                                            <x-nq::password-input id="pf-current-password" name="current-password" autocomplete="current-password" x-model="password" />
                                            <x-nq::field.error><span x-text="emailErrors.password"></span></x-nq::field.error>
                                        </x-nq::field>
                                        <x-nq::dialog.footer>
                                            <x-nq::button type="button" variant="ghost" x-on:click="emailOpen = false" x-bind:disabled="emailBusy ? '' : null">{{ $strings['cancel'] }}</x-nq::button>
                                            <x-nq::button type="submit" variant="primary" x-bind:aria-busy="emailBusy ? 'true' : null" x-bind:data-disabled="emailBusy ? '' : null">
                                                <x-nq::spinner x-show="emailBusy" style="display: none" />
                                                {{ $strings['sendConfirmation'] }}
                                            </x-nq::button>
                                        </x-nq::dialog.footer>
                                    </form>
                                </x-nq::dialog.content>
                            </x-nq::dialog>
                        </div>
                    @endif
                </x-nq::field>
                <div class="{{ $grid }}">
                    <x-nq::field x-model="bad.phone">
                        <x-nq::field.label>{{ $strings['phone'] }}</x-nq::field.label>
                        <x-nq::phone-input name="phone" :value="$v['phone']" :default-country="$defaultCountry" :disabled="$disabled" x-model="phone" />
                        <x-nq::field.error><span x-text="errs.phone"></span></x-nq::field.error>
                        <x-nq::field.description x-show="! bad.phone">{{ $strings['phoneHelp'] }}</x-nq::field.description>
                    </x-nq::field>
                </div>
            </section>

            <section aria-labelledby="pf-prefs" data-slot="profile-form-group" class="{{ $group }}">
                <div class="flex flex-col gap-1">
                    <h3 id="pf-prefs" class="text-h3 text-foreground">{{ $strings['preferences'] }}</h3>
                    <p class="text-body-sm text-muted-foreground">{{ $strings['preferencesHint'] }}</p>
                </div>
                <div class="{{ $grid }}">
                    <x-nq::field>
                        <x-nq::field.label>{{ $strings['language'] }}</x-nq::field.label>
                        <x-nq::select name="locale" :value="$v['locale']" x-model="locale">
                            <x-nq::select.trigger :disabled="$disabled"><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($languages as $code => $label)
                                    <x-nq::select.item :value="(string) $code">{{ $label }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $strings['timezone'] }}</x-nq::field.label>
                        <x-nq::combobox :value="$v['timezone']" x-model="timezone">
                            <x-nq::combobox.input :clearable="false" :placeholder="$strings['timezoneSearch']" :trigger-label="$strings['open']" :clear-label="$strings['clear']" :disabled="$disabled" />
                            <x-nq::combobox.content>
                                <x-nq::combobox.empty>{{ $strings['timezoneEmpty'] }}</x-nq::combobox.empty>
                                <x-nq::combobox.list>
                                    @foreach ($timezones as $id => $label)
                                        <x-nq::combobox.item :value="(string) $id"><bdi>{{ $label }}</bdi></x-nq::combobox.item>
                                    @endforeach
                                </x-nq::combobox.list>
                            </x-nq::combobox.content>
                        </x-nq::combobox>
                        <input type="hidden" name="timezone" x-bind:value="timezone" value="{{ $v['timezone'] }}">
                    </x-nq::field>
                </div>
            </section>
        </div>
    </div>

    <span role="status" class="sr-only" x-text="dirty ? @js($strings['unsaved']) : (notice ?? '')"></span>
    <div role="region" aria-label="{{ $strings['unsaved'] }}" data-slot="profile-form-savebar" x-show="dirty" style="display: none"
        class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-floating border border-border bg-popover p-3 text-popover-foreground shadow-floating">
        <p class="flex items-center gap-2 text-body-sm"><x-lucide-triangle-alert aria-hidden="true" class="size-4 text-nq-warning-text" />{{ $strings['unsaved'] }}</p>
        <div class="flex gap-2">
            <x-nq::button type="button" variant="ghost" x-on:click="discard()" x-bind:disabled="saving ? '' : null">{{ $strings['discard'] }}</x-nq::button>
            <x-nq::button type="submit" variant="primary" x-bind:aria-busy="saving ? 'true' : null" x-bind:data-disabled="(blocked || saving) ? '' : null" x-bind:disabled="blocked">
                <x-nq::spinner x-show="saving" style="display: none" />
                {{ $strings['save'] }}
            </x-nq::button>
        </div>
    </div>
</form>

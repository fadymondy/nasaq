{{-- <x-nq::two-factor-setup otpauth-uri="otpauth://totp/Nasaq:fady@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Nasaq"
         @nq-2fa-verify="$event.detail.wait(verifyTotp($event.detail.code))" />
     Turn on TOTP two-factor authentication in three steps: scan the QR code (or type the key), confirm a 6-digit code, save the recovery codes.
     Once on, it shows the status with regenerate and disable. Presentational: your handlers talk to the server. The QR, key and codes stay left-to-right in Arabic.
     otpauth-uri: the otpauth://totp/... URI the QR encodes (your server makes it with a fresh secret). secret: the base32 key for manual entry (default: read from the URI).
     enabled: show the enabled state (x-modelable; omit to switch after the last step). recovery-codes: codes for step 3 when you already have them (else return them from verify).
     recovery-codes-remaining: enabled state, unused codes (fewer than 3 warns). confirm-with: password (default) | code. can-regenerate / can-disable: show those actions (default true).
     download-filename: "recovery-codes.txt". labels: override any string.
     Events, each with detail.wait(promise): `nq-2fa-verify` { code } resolve { error?, recoveryCodes? }; `nq-2fa-regenerate` { credential } resolve the new codes (array) or { error };
     `nq-2fa-disable` { credential } resolve nothing or { error }. `nq-2fa-complete` fires when the user finishes. Needs the Alpine runtime. --}}
@props(['otpauthUri', 'secret' => null, 'enabled' => false, 'recoveryCodes' => [], 'recoveryCodesRemaining' => null, 'confirmWith' => 'password', 'canRegenerate' => true, 'canDisable' => true, 'downloadFilename' => 'recovery-codes.txt', 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $s = array_merge([
        'title' => $t::t('Two-factor authentication', 'المصادقة الثنائية'),
        'description' => $t::t('Ask for a code from an authenticator app each time you sign in.', 'اطلب رمزًا من تطبيق المصادقة في كل مرة تسجّل فيها الدخول.'),
        'step' => $t::t('Step {n} of {total}', 'الخطوة {n} من {total}'),
        'scanTitle' => $t::t('Scan the QR code', 'امسح رمز QR'),
        'scanBody' => $t::t('Open an authenticator app such as 1Password, Authy or Google Authenticator and scan this code.', 'افتح تطبيق مصادقة مثل 1Password أو Authy أو Google Authenticator وامسح هذا الرمز.'),
        'qrLabel' => $t::t('QR code for your authenticator app', 'رمز QR لتطبيق المصادقة'),
        'cantScan' => $t::t("Can't scan? Enter this key instead", 'لا يمكنك المسح؟ أدخل هذا المفتاح بدلًا من ذلك'),
        'keyLabel' => $t::t('Setup key', 'مفتاح الإعداد'),
        'copyKey' => $t::t('Copy setup key', 'نسخ مفتاح الإعداد'),
        'next' => $t::t('Next', 'التالي'),
        'verifyTitle' => $t::t('Enter the 6-digit code', 'أدخل الرمز المكوّن من 6 أرقام'),
        'verifyBody' => $t::t('Type the code your authenticator app shows now to confirm it is set up.', 'اكتب الرمز الذي يعرضه تطبيق المصادقة الآن للتأكد من اكتمال الإعداد.'),
        'codeLabel' => $t::t('Verification code', 'رمز التحقق'),
        'verify' => $t::t('Verify and continue', 'تحقّق وتابع'),
        'back' => $t::t('Back', 'رجوع'),
        'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'recoveryTitle' => $t::t('Save your recovery codes', 'احفظ رموز الاسترداد'),
        'recoveryBody' => $t::t('If you lose your phone, each of these codes lets you sign in once. Store them somewhere safe. They will not be shown again.', 'إذا فقدت هاتفك، يتيح لك كل رمز من هذه الرموز تسجيل الدخول مرة واحدة. احفظها في مكان آمن. لن تُعرض مرة أخرى.'),
        'recoveryList' => $t::t('Recovery codes', 'رموز الاسترداد'),
        'copyAll' => $t::t('Copy all', 'نسخ الكل'),
        'download' => $t::t('Download .txt', 'تنزيل .txt'),
        'saved' => $t::t('I saved these recovery codes', 'لقد حفظت رموز الاسترداد'),
        'finish' => $t::t('Finish', 'إنهاء'),
        'fileHeader' => $t::t('Recovery codes', 'رموز الاسترداد'),
        'enabledTitle' => $t::t('Two-factor authentication is on', 'المصادقة الثنائية مفعّلة'),
        'enabledBody' => $t::t('You will be asked for a code from your authenticator app when you sign in.', 'سيُطلب منك رمز من تطبيق المصادقة عند تسجيل الدخول.'),
        'statusOn' => $t::t('Enabled', 'مفعّلة'),
        'remainingOne' => $t::t('1 recovery code left', 'بقي رمز استرداد واحد'),
        'remainingMany' => $t::t('{n} recovery codes left', 'بقي {n} رموز استرداد'),
        'regenerate' => $t::t('Regenerate recovery codes', 'إعادة إنشاء رموز الاسترداد'),
        'regenTitle' => $t::t('Regenerate recovery codes?', 'إعادة إنشاء رموز الاسترداد؟'),
        'regenBody' => $t::t('Your current recovery codes stop working. Confirm to get a new set.', 'ستتوقف رموز الاسترداد الحالية عن العمل. أكّد للحصول على مجموعة جديدة.'),
        'regenConfirm' => $t::t('Regenerate', 'إعادة الإنشاء'),
        'regenDone' => $t::t('Your new recovery codes', 'رموز الاسترداد الجديدة'),
        'disable' => $t::t('Disable two-factor', 'تعطيل المصادقة الثنائية'),
        'disableTitle' => $t::t('Disable two-factor authentication?', 'تعطيل المصادقة الثنائية؟'),
        'disableBody' => $t::t('Your account will be protected by your password alone.', 'سيُحمى حسابك بكلمة المرور وحدها.'),
        'disableConfirm' => $t::t('Disable', 'تعطيل'),
        'password' => $t::t('Password', 'كلمة المرور'),
        'authCode' => $t::t('Authentication code', 'رمز المصادقة'),
        'confirmPassword' => $t::t('Enter your password to continue.', 'أدخل كلمة المرور للمتابعة.'),
        'confirmCode' => $t::t('Enter a code from your authenticator app to continue.', 'أدخل رمزًا من تطبيق المصادقة للمتابعة.'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
    ], (array) $labels);
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    // The key shown for manual entry: the explicit secret, else the one inside the otpauth URI. Upper-case base32, no spaces or dashes.
    $parts = parse_url((string) $otpauthUri) ?: [];
    parse_str($parts['query'] ?? '', $query);
    $raw = $secret ?? (($parts['scheme'] ?? '') === 'otpauth' ? ($query['secret'] ?? '') : '');
    $key = strtoupper(preg_replace('/[\s-]+/', '', (string) $raw));
    $grouped = trim(chunk_split($key, 4, ' '));
    $codes = array_values((array) $recoveryCodes);
    $init = [
        'uri' => (string) $otpauthUri,
        'enabled' => (bool) $enabled,
        'codes' => $codes,
        'remaining' => $recoveryCodesRemaining === null ? null : (int) $recoveryCodesRemaining,
        'mode' => $confirmWith === 'code' ? 'code' : 'password',
        'messages' => ['genericError' => $s['genericError'], 'fileHeader' => $s['fileHeader']],
    ];
    $strings = $s;
    $uid = 'nq-2fa-'.substr(md5((string) $otpauthUri), 0, 6);
    $hide = fn (bool $shown) => $shown ? '' : 'display: none';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'two-factor-setup') }}" x-data="nqTwoFactorSetup({!! $js($init) !!})" x-modelable="enabled" x-id="['nq-2fa']"
    x-bind:data-state="enabled ? 'enabled' : 'step-' + step"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-lg') }}>
    {{-- Enabled --}}
    <div class="contents" x-show="enabled" @unless ($enabled) style="display: none" @endunless>
        <x-nq::card.header>
            <x-nq::card.title as="h2">{{ $s['enabledTitle'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $s['enabledBody'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
                <x-nq::status tone="success" icon="shield-check">{{ $s['statusOn'] }}</x-nq::status>
                <x-nq::status tone="warning" icon="key-round" x-show="remaining !== null && remaining < 3"
                    :style="$hide($recoveryCodesRemaining !== null && $recoveryCodesRemaining < 3)"><span x-text="remaining === 1 ? {!! $js($s['remainingOne']) !!} : {!! $js($s['remainingMany']) !!}.replace('{n}', remaining)">{{ $recoveryCodesRemaining === 1 ? $s['remainingOne'] : str_replace('{n}', (string) $recoveryCodesRemaining, $s['remainingMany']) }}</span></x-nq::status>
                <x-nq::status tone="neutral" icon="key-round" x-show="remaining !== null && remaining >= 3"
                    :style="$hide($recoveryCodesRemaining !== null && $recoveryCodesRemaining >= 3)"><span x-text="{!! $js($s['remainingMany']) !!}.replace('{n}', remaining)">{{ str_replace('{n}', (string) $recoveryCodesRemaining, $s['remainingMany']) }}</span></x-nq::status>
            </div>
            <div class="flex flex-col gap-3" x-show="fresh" style="display: none">
                <p class="text-label text-foreground">{{ $s['regenDone'] }}</p>
                <x-nq::two-factor-setup.recovery source="fresh" confirm="fresh = null; saved = false" :strings="$s" :filename="$downloadFilename" />
            </div>
        </x-nq::card.content>
        <div data-slot="card-footer" class="flex flex-wrap gap-2 px-4" x-show="! fresh">
            @if ($canRegenerate)
                <x-nq::two-factor-setup.credential-dialog action="regenerate" :label="$s['regenerate']" :title="$s['regenTitle']" :description="$s['regenBody']"
                    :confirm-label="$s['regenConfirm']" :mode="$confirmWith === 'code' ? 'code' : 'password'" :strings="$s" :uid="$uid" />
            @endif
            @if ($canDisable)
                <x-nq::two-factor-setup.credential-dialog action="disable" :label="$s['disable']" :title="$s['disableTitle']" :description="$s['disableBody']"
                    :confirm-label="$s['disableConfirm']" danger :mode="$confirmWith === 'code' ? 'code' : 'password'" :strings="$s" :uid="$uid" />
            @endif
        </div>
    </div>
    {{-- Setup, steps 1 to 3 --}}
    <div class="contents" x-show="! enabled" @if ($enabled) style="display: none" @endif>
        <x-nq::card.header>
            <x-nq::card.title as="h2">{{ $s['title'] }}</x-nq::card.title>
            <x-nq::card.description>{{ $s['description'] }}</x-nq::card.description>
        </x-nq::card.header>
        <x-nq::card.content class="flex flex-col gap-4">
            <ol data-slot="two-factor-steps" class="flex gap-1.5">
                @foreach ([1, 2, 3] as $n)
                    <li x-bind:aria-current="step === {{ $n }} ? 'step' : null" x-bind:class="{ 'bg-primary': step >= {{ $n }}, 'bg-secondary': step < {{ $n }} }"
                        class="h-1 flex-1 rounded-full {{ $n === 1 ? 'bg-primary' : 'bg-secondary' }}">
                        <span class="sr-only">{{ str_replace(['{n}', '{total}'], [$n, 3], $s['step']) }}</span>
                    </li>
                @endforeach
            </ol>
            <div class="flex flex-col gap-4" data-slot="two-factor-scan" x-show="step === 1">
                <div class="flex flex-col gap-1">
                    <h3 class="text-label text-foreground">{{ $s['scanTitle'] }}</h3>
                    <p class="text-body-sm text-muted-foreground">{{ $s['scanBody'] }}</p>
                </div>
                <svg data-slot="two-factor-qr" role="img" aria-label="{{ $s['qrLabel'] }}" viewBox="0 0 1 1" x-bind:view-box.camel="'0 0 ' + qr.size + ' ' + qr.size" shape-rendering="crispEdges"
                    class="aspect-square w-full max-w-48 rounded-control border border-border bg-white">
                    <path x-bind:d="qr.path" class="fill-black" />
                </svg>
                @if ($key !== '')
                    <details class="rounded-control border border-border px-3 py-2">
                        <summary class="cursor-pointer text-body-sm text-foreground">{{ $s['cantScan'] }}</summary>
                        <div class="mt-2 flex items-center gap-2" data-slot="two-factor-key">
                            <code dir="ltr" aria-label="{{ $s['keyLabel'] }}" class="min-w-0 flex-1 select-all break-all font-mono text-body tabular-nums text-foreground">{{ $grouped }}</code>
                            <x-nq::copy-button :value="$key" :label="$s['copyKey']" />
                        </div>
                    </details>
                @endif
                <div>
                    <x-nq::button type="button" variant="primary" x-on:click="next()">{{ $s['next'] }}</x-nq::button>
                </div>
            </div>
            <form class="flex flex-col gap-4" data-slot="two-factor-verify" x-show="step === 2" style="display: none" x-on:submit.prevent="verify(code)" x-effect="markInvalid($el)">
                <div class="flex flex-col gap-1">
                    <h3 class="text-label text-foreground">{{ $s['verifyTitle'] }}</h3>
                    <p class="text-body-sm text-muted-foreground">{{ $s['verifyBody'] }}</p>
                </div>
                <div data-slot="field" class="flex w-fit flex-col gap-1.5">
                    <span class="text-label text-foreground">{{ $s['codeLabel'] }}</span>
                    <x-nq::otp-input name="code" x-model="code" x-on:complete="verify($event.detail)" />
                    <p role="alert" class="text-caption text-nq-danger-text" x-show="error" x-text="error" style="display: none"></p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <x-nq::button type="button" variant="ghost" x-on:click="back()" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null">{{ $s['back'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="code.length !== 6 || pending" x-bind:data-disabled="(code.length !== 6 || pending) ? '' : null"
                        x-bind:aria-busy="pending ? 'true' : null">
                        <x-nq::spinner x-show="pending" style="display: none" />
                        {{ $s['verify'] }}
                    </x-nq::button>
                </div>
            </form>
            <div class="flex flex-col gap-3" x-show="step === 3" style="display: none">
                <div class="flex flex-col gap-1">
                    <h3 class="text-label text-foreground">{{ $s['recoveryTitle'] }}</h3>
                    <p class="text-body-sm text-muted-foreground">{{ $s['recoveryBody'] }}</p>
                </div>
                <x-nq::two-factor-setup.recovery source="codes" confirm="finish()" :strings="$s" :filename="$downloadFilename" />
            </div>
        </x-nq::card.content>
    </div>
</div>

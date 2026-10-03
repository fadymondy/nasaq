{{-- <x-nq::lock-screen :user="['name' => 'Nour Adel', 'email' => 'nour@example.com']" :methods="['pin', 'password']" sign-out
         x-on:nq-lock-unlock="$event.detail.waitUntil(check($event.detail))" x-on:nq-lock-sign-out="signOut()" />
     An OS-style lock screen: a wallpaper with the clock, the person's avatar and one way to unlock at a time: PIN keypad, password (with an optional
     authenticator code), biometrics or a passkey. It counts wrong attempts and locks out for a while. It verifies nothing itself: your listener does.
     user: ['name', 'email', 'avatar']. methods: the ways to unlock, in order (pin | password | biometric | passkey; default ['pin']). default-method: which to open on.
     pin-length: default 6. require-code: ask for an authenticator code with the password. reason: locked | idle | quiet (quiet-mode gate). max-attempts: wrong
     secrets in a row before a lockout (5). lockout-seconds: 30. show-clock: default true. now: freeze the clock (a timestamp or a local date-time string).
     Events (bubble from the root; detail.waitUntil(promise); resolve nothing to unlock or { error } for a wrong secret): nq-lock-unlock { method, secret, code },
     nq-lock-switch-account { account } (the chosen one, or null; shown with switch-account), nq-lock-sign-out (shown with sign-out).
     accounts: other signed-in accounts for "Switch account": [['name', 'email', 'avatar']]. show-mark: false hides the product mark. Slots: mark (your mark
     instead), wallpaper (an image or gradient under the scrim), footer. labels: override any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['user', 'methods' => ['pin'], 'defaultMethod' => null, 'pinLength' => 6, 'requireCode' => false, 'reason' => 'locked', 'signOut' => false, 'accounts' => [],
    'switchAccount' => false, 'showMark' => true, 'showClock' => true, 'now' => null, 'maxAttempts' => 5, 'lockoutSeconds' => 30, 'mark' => null, 'wallpaper' => null,
    'footer' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'lockedTitle' => $t::t('Locked', 'مقفل'),
        'lockedDescription' => $t::t('Enter your credentials to continue.', 'أدخل بياناتك للمتابعة.'),
        'idleTitle' => $t::t('Locked after inactivity', 'أُقفل بعد فترة خمول'),
        'idleDescription' => $t::t('You were away, so we locked the app to protect your data.', 'كنت بعيدًا، فأقفلنا التطبيق لحماية بياناتك.'),
        'quietTitle' => $t::t('Quiet mode is on', 'الوضع الهادئ مفعّل'),
        'quietDescription' => $t::t('Notifications are paused. Enter your PIN to look inside.', 'الإشعارات متوقفة. أدخل الرقم السري لتصفّح المحتوى.'),
        'pinGroup' => $t::t('PIN keypad', 'لوحة الرقم السري'),
        'digit' => $t::t('Digit {digit}', 'الرقم {digit}'),
        'backspace' => $t::t('Delete last digit', 'حذف آخر رقم'),
        'passwordLabel' => $t::t('Password', 'كلمة المرور'),
        'codeLabel' => $t::t('Authenticator code', 'رمز تطبيق المصادقة'),
        'box' => $t::t('Digit {index} of {length}', 'الخانة {index} من {length}'),
        'unlock' => $t::t('Unlock', 'فتح القفل'),
        'biometric' => $t::t('Use biometrics', 'استخدم البصمة أو الوجه'),
        'biometricHint' => $t::t('Use your fingerprint or face to unlock.', 'استخدم بصمتك أو وجهك لفتح القفل.'),
        'biometricPrompt' => $t::t('Waiting for your device', 'بانتظار جهازك'),
        'passkey' => $t::t('Use a passkey', 'استخدم مفتاح المرور'),
        'passkeyHint' => $t::t('Confirm with the passkey on this device.', 'أكّد بمفتاح المرور على هذا الجهاز.'),
        'passkeyPrompt' => $t::t('Waiting for your passkey', 'بانتظار مفتاح المرور'),
        'usePasskey' => $t::t('Use a passkey', 'استخدم مفتاح المرور'),
        'switchAccount' => $t::t('Switch account', 'تبديل الحساب'),
        'switchAccountMenu' => $t::t('Accounts on this device', 'الحسابات على هذا الجهاز'),
        'anotherAccount' => $t::t('Sign in to another account', 'سجّل الدخول بحساب آخر'),
        'usePin' => $t::t('Use PIN', 'استخدم الرقم السري'),
        'usePassword' => $t::t('Use password', 'استخدم كلمة المرور'),
        'useBiometric' => $t::t('Use biometrics', 'استخدم البصمة أو الوجه'),
        'signOut' => $t::t('Not you? Sign out', 'لست أنت؟ سجّل الخروج'),
        'passwordRequired' => $t::t('Enter your password.', 'أدخل كلمة المرور.'),
        'codeRequired' => $t::t('Enter all {length} digits of the code.', 'أدخل الأرقام الـ {length} كاملة للرمز.'),
        'wrongPin' => $t::t('That PIN is not right. {left} tries left.', 'الرقم السري غير صحيح. تبقّت {left} محاولات.'),
        'lockout' => $t::t('Too many attempts. Try again in {time}.', 'محاولات كثيرة. حاول مرة أخرى بعد {time}.'),
        'entered' => $t::t('{count} of {length} digits entered', 'أُدخل {count} من {length} أرقام'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $methods = array_values(array_intersect(['pin', 'password', 'biometric', 'passkey'], (array) $methods)) ?: ['pin'];
    $first = $defaultMethod && in_array($defaultMethod, $methods, true) ? $defaultMethod : $methods[0];
    $reason = in_array($reason, ['locked', 'idle', 'quiet'], true) ? $reason : 'locked';
    $title = $l[$reason.'Title'];
    $description = $l[$reason.'Description'];
    $otherLabel = ['pin' => $l['usePin'], 'password' => $l['usePassword'], 'biometric' => $l['useBiometric'], 'passkey' => $l['usePasskey']];
    $accounts = array_values((array) $accounts);
    $uid = 'nq-lock-'.\Illuminate\Support\Str::random(6);
    $config = [
        'methods' => $methods, 'defaultMethod' => $first, 'pinLength' => (int) $pinLength, 'requireCode' => (bool) $requireCode, 'maxAttempts' => (int) $maxAttempts,
        'lockoutSeconds' => (int) $lockoutSeconds, 'now' => $now, 'locale' => app()->getLocale(), 'accounts' => $accounts, 'failed' => $l['failed'],
        'labels' => array_intersect_key($l, array_flip(['passwordRequired', 'codeRequired', 'wrongPin', 'lockout', 'entered', 'failed'])),
    ];
    $has = fn ($s) => $s && ! $s->isEmpty();
    $keyClass = 'h-14 w-full text-h3 font-normal tabular-nums pointer-coarse:h-16';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'lock-screen') }}" data-reason="{{ $reason }}" x-data="nqLockScreen(@js($config))"
    x-bind:data-method="method" x-bind:aria-busy="pending ? 'true' : null"
    {{ $attributes->except('data-slot')->cn('relative isolate flex min-h-dvh flex-col overflow-hidden bg-muted text-foreground') }}>
    <div aria-hidden="true" data-slot="lock-screen-wallpaper" class="absolute inset-0 -z-10">
        @if ($has($wallpaper)) {{ $wallpaper }} @endif
        <div class="absolute inset-0 bg-background/55 backdrop-blur-sm"></div>
    </div>

    @if ($showClock)
        <div data-slot="lock-screen-clock" class="flex flex-col items-center gap-1 px-4 pt-10 text-center sm:pt-14">
            <time dir="ltr" class="text-[clamp(3rem,10vw,5rem)] leading-none font-light tabular-nums text-foreground" x-text="time"></time>
            <p class="text-body text-muted-foreground first-letter:uppercase" x-text="date"></p>
        </div>
    @endif

    <main class="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
        @if ($has($mark))
            <div data-slot="lock-screen-mark">{{ $mark }}</div>
        @elseif ($showMark)
            <div data-slot="lock-screen-mark"><x-nq::product-mark :size="28" title="" /></div>
        @endif
        <div class="flex flex-col items-center gap-2">
            <x-nq::avatar :name="$user['name'] ?? ''" :src="$user['avatar'] ?? null" size="lg" />
            <div class="flex flex-col gap-0.5">
                <h1 class="text-h3 text-foreground">{{ $user['name'] ?? '' }}</h1>
                @if (! empty($user['email'])) <p dir="ltr" class="text-caption text-muted-foreground">{{ $user['email'] }}</p> @endif
            </div>
        </div>

        <div class="flex flex-col items-center gap-1">
            <p class="inline-flex items-center gap-1.5 text-label text-foreground">
                @if ($reason === 'quiet') <x-lucide-bell-off aria-hidden="true" class="size-4" /> @else <x-lucide-lock-keyhole aria-hidden="true" class="size-4" /> @endif
                {{ $title }}
            </p>
            <p class="text-body-sm text-muted-foreground">{{ $description }}</p>
        </div>

        <div class="flex w-full flex-col items-center gap-4" x-on:keydown="onKey($event)">
            @if (in_array('pin', $methods, true))
                <template x-if="method === 'pin'">
                    <div data-slot="lock-screen-pad" role="group" aria-label="{{ $l['pinGroup'] }}" tabindex="0" dir="ltr"
                        class="flex w-full max-w-64 flex-col items-center gap-5 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nq-focus">
                        <div class="flex gap-3" aria-hidden="true" x-bind:data-invalid="hasMessage() ? '' : null">
                            @for ($i = 0; $i < (int) $pinLength; $i++)
                                <span x-bind:data-filled="filled({{ $i }}) ? '' : null"
                                    x-bind:class="[hasMessage() ? 'border-nq-danger' : (filled({{ $i }}) ? 'border-transparent' : 'border-nq-line-strong'), filled({{ $i }}) ? (hasMessage() ? 'bg-nq-danger' : 'bg-foreground') : 'bg-transparent']"
                                    class="size-3 rounded-full border transition-colors duration-150 ease-nq motion-reduce:transition-none"></span>
                            @endfor
                        </div>
                        <span role="status" class="sr-only" x-text="count()"></span>
                        <div class="grid w-full grid-cols-3 gap-2">
                            @foreach (['1', '2', '3', '4', '5', '6', '7', '8', '9'] as $key)
                                <x-nq::button type="button" variant="secondary" tabindex="-1" aria-label="{{ str_replace('{digit}', $key, $l['digit']) }}" class="{{ $keyClass }}"
                                    x-on:click="pressKey('{{ $key }}')" x-bind:disabled="off()" x-bind:data-disabled="off() ? '' : null">{{ $key }}</x-nq::button>
                            @endforeach
                            <span aria-hidden="true"></span>
                            <x-nq::button type="button" variant="secondary" tabindex="-1" aria-label="{{ str_replace('{digit}', '0', $l['digit']) }}" class="{{ $keyClass }}"
                                x-on:click="pressKey('0')" x-bind:disabled="off()" x-bind:data-disabled="off() ? '' : null">0</x-nq::button>
                            <x-nq::button type="button" variant="ghost" tabindex="-1" aria-label="{{ $l['backspace'] }}" class="{{ $keyClass }}" x-on:click="backspace()"
                                x-bind:disabled="off() || pin.length === 0" x-bind:data-disabled="off() || pin.length === 0 ? '' : null"><x-lucide-delete aria-hidden="true" class="size-5" /></x-nq::button>
                        </div>
                    </div>
                </template>
            @endif

            @if (in_array('password', $methods, true))
                <template x-if="method === 'password'">
                    <form novalidate data-slot="lock-screen-password" class="flex w-full flex-col gap-3 text-start" x-on:submit.prevent="submitPassword()">
                        <x-nq::field name="secret" x-model="bad.secret">
                            <x-nq::field.label for="{{ $uid }}-secret">{{ $l['passwordLabel'] }}</x-nq::field.label>
                            <x-nq::password-input id="{{ $uid }}-secret" name="secret" autofocus autocomplete="current-password" x-model="password" x-bind:disabled="locked()"
                                x-bind:aria-invalid="hasMessage() ? 'true' : null" />
                        </x-nq::field>
                        @if ($requireCode)
                            <div class="flex flex-col items-center gap-2">
                                <span class="self-start text-label text-foreground">{{ $l['codeLabel'] }}</span>
                                <x-nq::otp-input name="code" :length="6" aria-label="{{ $l['codeLabel'] }}" x-model="code" />
                            </div>
                        @endif
                        <x-nq::button type="submit" variant="primary" size="lg" x-bind:disabled="locked()" x-bind:data-disabled="locked() ? '' : null"
                            x-bind:aria-busy="pending ? 'true' : null">
                            <template x-if="pending"><x-nq::spinner /></template>
                            {{ $l['unlock'] }}
                        </x-nq::button>
                    </form>
                </template>
            @endif

            @if (in_array('biometric', $methods, true))
                <template x-if="method === 'biometric'">
                    <div data-slot="lock-screen-biometric" class="flex flex-col items-center gap-3">
                        <span class="inline-flex size-20 items-center justify-center rounded-full border border-border bg-card text-foreground">
                            <x-lucide-fingerprint aria-hidden="true" class="size-10" />
                        </span>
                        <p class="text-body-sm text-muted-foreground" x-text="pending ? @js($l['biometricPrompt']) : @js($l['biometricHint'])">{{ $l['biometricHint'] }}</p>
                        <x-nq::button type="button" variant="primary" size="lg" x-on:click="attempt('biometric', '')" x-bind:disabled="locked() || pending"
                            x-bind:data-disabled="locked() || pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
                            <template x-if="pending"><x-nq::spinner /></template>
                            {{ $l['biometric'] }}
                        </x-nq::button>
                    </div>
                </template>
            @endif

            @if (in_array('passkey', $methods, true))
                <template x-if="method === 'passkey'">
                    <div data-slot="lock-screen-passkey" class="flex flex-col items-center gap-3">
                        <span class="inline-flex size-20 items-center justify-center rounded-full border border-border bg-card text-foreground">
                            <x-lucide-key-round aria-hidden="true" class="size-10" />
                        </span>
                        <p class="text-body-sm text-muted-foreground" x-text="pending ? @js($l['passkeyPrompt']) : @js($l['passkeyHint'])">{{ $l['passkeyHint'] }}</p>
                        <x-nq::button type="button" variant="primary" size="lg" x-on:click="attempt('passkey', '')" x-bind:disabled="locked() || pending"
                            x-bind:data-disabled="locked() || pending ? '' : null" x-bind:aria-busy="pending ? 'true' : null">
                            <template x-if="pending"><x-nq::spinner /></template>
                            {{ $l['passkey'] }}
                        </x-nq::button>
                    </div>
                </template>
            @endif

            <div class="min-h-5 w-full" aria-live="polite">
                <p role="alert" class="text-caption text-nq-danger-text" style="display: none" x-show="showPlain()" x-text="message()"></p>
                <x-nq::alert tone="danger" style="display: none" x-show="showAlert()"><span x-text="message()"></span></x-nq::alert>
            </div>
        </div>

        @if (count($methods) > 1)
            <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                @foreach ($methods as $m)
                    <x-nq::button type="button" variant="link" size="sm" style="display: none" x-show="method !== '{{ $m }}'" x-on:click="switchMethod('{{ $m }}')" x-bind:disabled="pending"
                        x-bind:data-disabled="pending ? '' : null">
                        @switch($m)
                            @case('pin') <x-lucide-hash aria-hidden="true" /> @break
                            @case('password') <x-lucide-key-round aria-hidden="true" /> @break
                            @case('biometric') <x-lucide-fingerprint aria-hidden="true" /> @break
                            @default <x-lucide-user-round-cog aria-hidden="true" />
                        @endswitch
                        {{ $otherLabel[$m] }}
                    </x-nq::button>
                @endforeach
            </div>
        @endif

        @if ($switchAccount)
            <x-nq::dropdown-menu>
                <x-nq::dropdown-menu.trigger type="button" variant="link" size="sm" data-slot="lock-screen-switch" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null">
                    <x-lucide-user-plus aria-hidden="true" />
                    {{ $l['switchAccount'] }}
                    <x-lucide-chevron-down aria-hidden="true" />
                </x-nq::dropdown-menu.trigger>
                <x-nq::dropdown-menu.content side="top" align="center" class="w-64" aria-label="{{ $l['switchAccountMenu'] }}">
                    @foreach ($accounts as $i => $account)
                        <x-nq::dropdown-menu.item x-on:click="switchTo({{ $i }})">
                            <x-nq::avatar :name="$account['name'] ?? ''" :src="$account['avatar'] ?? null" size="sm" />
                            <span class="flex min-w-0 flex-col text-start">
                                <span class="truncate text-label">{{ $account['name'] ?? '' }}</span>
                                @if (! empty($account['email'])) <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ $account['email'] }}</bdi> @endif
                            </span>
                        </x-nq::dropdown-menu.item>
                    @endforeach
                    @if (count($accounts)) <x-nq::dropdown-menu.separator /> @endif
                    <x-nq::dropdown-menu.item x-on:click="switchTo(-1)">
                        <x-lucide-user-plus />
                        {{ $l['anotherAccount'] }}
                    </x-nq::dropdown-menu.item>
                </x-nq::dropdown-menu.content>
            </x-nq::dropdown-menu>
        @endif
        @if ($signOut)
            <x-nq::button type="button" variant="link" size="sm" x-on:click="signOut()" x-bind:disabled="pending" x-bind:data-disabled="pending ? '' : null">{{ $l['signOut'] }}</x-nq::button>
        @endif
    </main>
    @if ($has($footer))
        <div class="px-4 pb-4 text-center text-caption text-muted-foreground">{{ $footer }}</div>
    @endif
</div>

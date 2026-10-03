{{-- <x-nq::chrome-extension-install store-url="https://chromewebstore.google.com/detail/..." :installed="false" check sign-in />
     The install flow for a Chrome extension: add it from the Web Store, pin it, sign in. It shows whether the extension was detected, marks
     finished steps and keeps the next step in front. Pinning cannot be detected, so the person confirms it.
     store-url: the Web Store page. installed / signed-in: what your page detected (server side). version: shown when detected. pinned: starts pinned.
     check: shows "Check again"; sign-in: enables the "Sign in" button. supported (true): false shows the "use Chromium" notice.
     <x-slot:storeButton> replaces the store button content. labels: array overriding the built-in words.
     Needs the Alpine runtime (@nasaqScripts). The buttons dispatch bubbling events, each with { wait(promise) }: "nq-extension-check" (the promise may
     resolve { installed, version }), "nq-extension-signin" (resolve { error } to show it, or { signedIn: true }) and "nq-extension-pinned" ({ pinned }). --}}
@props(['storeUrl', 'installed' => false, 'version' => null, 'signedIn' => false, 'pinned' => false, 'check' => false, 'signIn' => false, 'supported' => true, 'storeButton' => null, 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $words = [
        'en' => [
            'title' => 'Install the browser extension', 'description' => 'Three steps: add it, pin it, sign in.', 'steps' => 'Installation steps',
            'detected' => 'Extension detected', 'detectedVersion' => 'Extension detected, version {version}', 'notDetected' => 'Extension not detected yet',
            'check' => 'Check again', 'checking' => 'Checking…',
            'unsupported' => 'Chrome extensions work in Chrome and other Chromium browsers such as Edge, Brave and Arc. Open this page in one of them.',
            'stepAdd' => 'Add it from the Chrome Web Store', 'stepAddBody' => 'Open the store page and choose Add to Chrome, then confirm in the pop-up.', 'addButton' => 'Open the Chrome Web Store',
            'stepPin' => 'Pin it to the toolbar', 'stepPinBody' => 'Click the puzzle-piece Extensions button next to the address bar, then the pin beside the extension. It stays one click away.',
            'pinnedButton' => 'I pinned it', 'unpin' => 'Undo',
            'stepSignIn' => 'Sign in from the extension', 'stepSignInBody' => 'Click the extension, then Sign in. It uses your account, so nothing is typed twice.',
            'signInButton' => 'Sign in', 'signedIn' => 'Signed in', 'signInFailed' => 'Could not sign in. Try again.', 'blocked' => 'Do the step above first.',
            'ready' => 'You are all set', 'readyBody' => 'The extension is installed, pinned and signed in.',
            'stepLabel' => 'Step {n} of {total}, {state}', 'stateDone' => 'done', 'stateCurrent' => 'current', 'stateTodo' => 'to do',
        ],
        'ar' => [
            'title' => 'ثبّت إضافة المتصفح', 'description' => 'ثلاث خطوات: أضفها، ثبّتها، سجّل الدخول.', 'steps' => 'خطوات التثبيت',
            'detected' => 'تم اكتشاف الإضافة', 'detectedVersion' => 'تم اكتشاف الإضافة، الإصدار {version}', 'notDetected' => 'لم تُكتشف الإضافة بعد',
            'check' => 'تحقق مرة أخرى', 'checking' => 'جارٍ التحقق…',
            'unsupported' => 'إضافات Chrome تعمل في Chrome والمتصفحات المبنية على Chromium مثل Edge وBrave وArc. افتح هذه الصفحة في أحدها.',
            'stepAdd' => 'أضفها من متجر Chrome الإلكتروني', 'stepAddBody' => 'افتح صفحة المتجر واختر «إضافة إلى Chrome»، ثم أكّد في النافذة المنبثقة.', 'addButton' => 'افتح متجر Chrome الإلكتروني',
            'stepPin' => 'ثبّتها في شريط الأدوات', 'stepPinBody' => 'اضغط زر الإضافات على شكل قطعة أحجية بجوار شريط العنوان، ثم الدبوس بجوار الإضافة. تبقى على بعد نقرة واحدة.',
            'pinnedButton' => 'ثبّتُّها', 'unpin' => 'تراجع',
            'stepSignIn' => 'سجّل الدخول من الإضافة', 'stepSignInBody' => 'اضغط على الإضافة ثم «تسجيل الدخول». تستخدم حسابك فلا تكتب شيئًا مرتين.',
            'signInButton' => 'تسجيل الدخول', 'signedIn' => 'تم تسجيل الدخول', 'signInFailed' => 'تعذر تسجيل الدخول. حاول مرة أخرى.', 'blocked' => 'أنجز الخطوة السابقة أولًا.',
            'ready' => 'كل شيء جاهز', 'readyBody' => 'الإضافة مثبّتة وموضوعة في شريط الأدوات ومسجَّل الدخول فيها.',
            'stepLabel' => 'الخطوة {n} من {total}، {state}', 'stateDone' => 'مكتملة', 'stateCurrent' => 'الحالية', 'stateTodo' => 'لم تبدأ',
        ],
    ];
    $t = array_merge($words[$ar ? 'ar' : 'en'], $labels);
    $flags = [(bool) $installed, $installed && $pinned, $installed && $signedIn];
    $current = array_search(false, $flags, true);
    $current = $current === false ? -1 : $current;
    $st = fn ($i) => $flags[$i] ? 'done' : ($i === $current ? 'current' : 'todo');
    $allDone = ! in_array(false, $flags, true);
    $stateText = ['done' => $t['stateDone'], 'current' => $t['stateCurrent'], 'todo' => $t['stateTodo']];
    $steps = [
        ['title' => $t['stepAdd'], 'body' => $t['stepAddBody']],
        ['title' => $t['stepPin'], 'body' => $t['stepPinBody']],
        ['title' => $t['stepSignIn'], 'body' => $t['stepSignInBody']],
    ];
    $config = [
        'installed' => (bool) $installed, 'signedIn' => (bool) $signedIn, 'pinned' => (bool) $pinned, 'version' => $version ?? '', 'canCheck' => (bool) $check, 'canSignIn' => (bool) $signIn,
        'detected' => $t['detected'], 'detectedVersion' => $t['detectedVersion'], 'signInFailed' => $t['signInFailed'],
    ];
    $circle = ['done' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text', 'current' => 'border-primary bg-primary text-primary-foreground', 'todo' => 'border-border bg-card text-muted-foreground'];
    $detectedText = $version ? str_replace('{version}', $version, $t['detectedVersion']) : $t['detected'];
@endphp
<div data-slot="chrome-extension-install" x-data="nqExtensionInstall({{ Js::from($config) }})" x-bind:data-state="rootState" {{ $attributes->cn("flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-2xl") }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2">{{ $t['title'] }}</x-nq::card.title>
        <x-nq::card.description>{{ $t['description'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-5">
        @unless ($supported)
            <x-nq::alert tone="warning">{{ $t['unsupported'] }}</x-nq::alert>
        @endunless
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-secondary px-3 py-2" data-slot="extension-detected" role="status">
            <x-nq::status x-show="installed" tone="success" :style="(! $installed) ? 'display: none' : null"><span x-text="detectedText">{{ $detectedText }}</span></x-nq::status>
            <x-nq::status x-show="!installed" tone="neutral" :style="($installed) ? 'display: none' : null">{{ $t['notDetected'] }}</x-nq::status>
            @if ($check)
                <x-nq::button type="button" size="sm" variant="ghost" x-show="!installed" x-on:click="check()" x-bind:aria-busy="checking ? 'true' : null" x-bind:data-disabled="checking ? '' : null" :style="($installed) ? 'display: none' : null">
                    <x-nq::spinner x-show="checking" style="display: none" />
                    <x-lucide-refresh-cw aria-hidden="true" x-show="!checking" />
                    <span x-text="checking ? {{ Js::from($t['checking']) }} : {{ Js::from($t['check']) }}">{{ $t['check'] }}</span>
                </x-nq::button>
            @endif
        </div>
        <ol aria-label="{{ $t['steps'] }}" class="flex flex-col gap-0">
            @foreach ($steps as $i => $step)
                @php
                    $s = $st($i);
                    $label = str_replace(['{n}', '{total}', '{state}'], [$i + 1, count($steps), $stateText[$s]], $t['stepLabel']);
                    $showActions = $s === 'current' || ($i === 1 && $installed) || ($i === 2 && $installed && ! $signedIn);
                @endphp
                <li data-slot="extension-step" x-bind:data-state="state({{ $i }})" x-bind:aria-current="state({{ $i }}) === 'current' ? 'step' : null" class="relative flex gap-3 pb-5 last:pb-0">
                    @if ($i < count($steps) - 1)
                        <span aria-hidden="true" class="absolute inset-y-7 start-[13px] w-px bg-border"></span>
                    @endif
                    <span aria-hidden="true"
                        x-bind:class="{ 'border-nq-success/40 bg-nq-success-soft text-nq-success-text': state({{ $i }}) === 'done', 'border-primary bg-primary text-primary-foreground': state({{ $i }}) === 'current', 'border-border bg-card text-muted-foreground': state({{ $i }}) === 'todo' }"
                        class="z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption tabular-nums {{ $circle[$s] }}">
                        <x-lucide-check class="size-4" x-show="state({{ $i }}) === 'done'" :style="($s !== 'done') ? 'display: none' : null" />
                        <span x-show="state({{ $i }}) !== 'done'" @if ($s === 'done') style="display: none" @endif>{{ $i + 1 }}</span>
                    </span>
                    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p x-bind:class="{ 'text-muted-foreground': state({{ $i }}) === 'todo', 'text-foreground': state({{ $i }}) !== 'todo' }" class="text-label {{ $s === 'todo' ? 'text-muted-foreground' : 'text-foreground' }}">
                            <span class="sr-only" x-text="{{ Js::from($t['stepLabel']) }}.replace('{n}', {{ $i + 1 }}).replace('{total}', {{ count($steps) }}).replace('{state}', { done: {{ Js::from($t['stateDone']) }}, current: {{ Js::from($t['stateCurrent']) }}, todo: {{ Js::from($t['stateTodo']) }} }[state({{ $i }})])">{{ $label }}</span><span class="sr-only">: </span>
                            {{ $step['title'] }}
                        </p>
                        <p x-show="state({{ $i }}) !== 'done'" class="text-body-sm text-muted-foreground" @if ($s === 'done') style="display: none" @endif>{{ $step['body'] }}</p>
                        @if ($i === 2)
                            <x-nq::status tone="success" x-show="state(2) === 'done'" :style="($s !== 'done') ? 'display: none' : null">{{ $t['signedIn'] }}</x-nq::status>
                        @endif
                        <div x-show="showActions({{ $i }})" class="flex flex-wrap items-center gap-2 pt-0.5" @if (! $showActions) style="display: none" @endif>
                            @if ($i === 0)
                                <x-nq::button variant="primary" size="sm" :href="$storeUrl" target="_blank" rel="noreferrer" data-slot="extension-store-link">
                                    @if ($storeButton && ! $storeButton->isEmpty())
                                        {{ $storeButton }}
                                    @else
                                        {{ $t['addButton'] }}<x-lucide-external-link aria-hidden="true" />
                                    @endif
                                </x-nq::button>
                            @elseif ($i === 1)
                                <x-nq::button type="button" size="sm" variant="ghost" x-show="pinned" x-on:click="setPinned(false)" :style="(! $pinned) ? 'display: none' : null">{{ $t['unpin'] }}</x-nq::button>
                                <x-nq::button type="button" size="sm" variant="primary" x-show="!pinned" x-bind:disabled="!installed || null" x-bind:data-disabled="!installed ? '' : null" x-on:click="setPinned(true)" :style="($pinned) ? 'display: none' : null">{{ $t['pinnedButton'] }}</x-nq::button>
                            @else
                                <x-nq::button type="button" size="sm" variant="primary" x-show="!signedIn" x-bind:disabled="(!installed || !canSignIn) || null" x-bind:aria-busy="signing ? 'true' : null" x-bind:data-disabled="(signing || !installed || !canSignIn) ? '' : null" x-on:click="signIn()" :style="($signedIn) ? 'display: none' : null">
                                    <x-nq::spinner x-show="signing" style="display: none" />{{ $t['signInButton'] }}
                                </x-nq::button>
                            @endif
                        </div>
                        @if ($i > 0)
                            <p x-show="state({{ $i }}) === 'todo' && !installed" class="text-caption text-muted-foreground" @if (! ($s === 'todo' && ! $installed)) style="display: none" @endif>{{ $t['blocked'] }}</p>
                        @endif
                        @if ($i === 2)
                            <p role="alert" x-show="error" x-text="error" class="text-caption text-nq-danger-text" style="display: none"></p>
                        @endif
                    </div>
                </li>
            @endforeach
        </ol>
        <x-nq::alert tone="success" :title="$t['ready']" x-show="allDone" :style="(! $allDone) ? 'display: none' : null">{{ $t['readyBody'] }}</x-nq::alert>
    </x-nq::card.content>
</div>

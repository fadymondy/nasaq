{{-- <x-nq::error-pages kind="not-found" home-href="/" back />   <x-nq::error-pages.server-error error-id="err_9f2a41" retry support-href="/support" />
     A full-page state for the places a product cannot show what was asked for. It shows what happened and what to do next, never a stack trace.
     kind: not-found | server-error | offline | maintenance | forbidden | unknown-workspace | coming-soon. The named parts (error-pages.not-found, .server-error,
     .offline, .maintenance, .forbidden, .unknown-workspace, .coming-soon) set the kind for you.
     title / description replace the copy. code: the big status code (404, 500, 403, 503 by kind); false hides it, a string replaces it. logo: false hides
     it, the <x-slot:logo> slot replaces it (default: the brand's mark and name). error-id (server-error, with a copy button), workspace (unknown-workspace),
     module-name (coming-soon), eta (maintenance; date or string), online (offline, true shows "back online, reload"; the page follows the browser's
     connection by itself). full-screen (true) is min-h-dvh; turn it off inside a panel. labels: array overriding the built-in words.
     Buttons show only when asked for: home-href, back (history.back), retry, support-href, switch-workspace-href, request-access, notify. retry,
     request-access and notify dispatch a bubbling "nq-error-retry" | "nq-error-access" | "nq-error-notify" event with { wait(promise) }; the button stays
     busy until the promise settles. With no listener retry reloads the page. The <x-slot:actions> slot replaces all buttons.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props([
    'kind', 'title' => null, 'description' => null, 'code' => true, 'logo' => true, 'errorId' => null, 'workspace' => null, 'moduleName' => null, 'eta' => null,
    'online' => false, 'homeHref' => null, 'back' => false, 'retry' => false, 'supportHref' => null, 'switchWorkspaceHref' => null, 'requestAccess' => false,
    'notify' => false, 'fullScreen' => true, 'labels' => [],
])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $words = [
        'en' => [
            'home' => 'Go to home', 'back' => 'Go back', 'retry' => 'Try again', 'support' => 'Contact support', 'switchWorkspace' => 'Switch workspace',
            'requestAccess' => 'Request access', 'notify' => 'Notify me', 'notified' => 'Done. We will tell you when it is ready.', 'reload' => 'Reload',
            'errorId' => 'Error ID', 'copyId' => 'Copy error ID',
            'notFoundTitle' => 'We could not find that page', 'notFoundBody' => 'The address may be mistyped, or the page may have moved or been removed.',
            'serverTitle' => 'Something went wrong on our side', 'serverBody' => 'The error has been recorded. Try again in a moment, and contact support if it keeps happening.',
            'offlineTitle' => 'You are offline', 'offlineBody' => 'Check your connection. Your changes are kept on this device and will sync when you are back.',
            'onlineTitle' => 'You are back online', 'onlineBody' => 'The connection is back. Reload to pick up where you left off.',
            'maintenanceTitle' => 'We are doing some maintenance', 'maintenanceBody' => 'The service is briefly unavailable while we make it better.', 'maintenanceEta' => 'Expected back',
            'forbiddenTitle' => 'You do not have access to this page', 'forbiddenBody' => 'Your account does not have permission to see this. Ask an admin of the workspace for access.',
            'workspaceTitle' => 'That workspace does not exist', 'workspaceBody' => 'The workspace address may be wrong, or you may have been removed from it.', 'workspaceNamed' => 'There is no workspace called {name}.',
            'soonTitle' => 'Coming soon', 'soonBody' => 'We are still building this part. It will show up here when it is ready.', 'soonNamed' => '{name} is coming soon',
        ],
        'ar' => [
            'home' => 'الذهاب إلى الرئيسية', 'back' => 'رجوع', 'retry' => 'حاول مرة أخرى', 'support' => 'تواصل مع الدعم', 'switchWorkspace' => 'تبديل مساحة العمل',
            'requestAccess' => 'طلب صلاحية', 'notify' => 'نبّهني', 'notified' => 'تم. سنخبرك عندما يصبح جاهزاً.', 'reload' => 'إعادة التحميل',
            'errorId' => 'معرّف الخطأ', 'copyId' => 'نسخ معرّف الخطأ',
            'notFoundTitle' => 'لم نعثر على هذه الصفحة', 'notFoundBody' => 'قد يكون العنوان مكتوباً بشكل خاطئ، أو أن الصفحة نُقلت أو حُذفت.',
            'serverTitle' => 'حدث خطأ من جهتنا', 'serverBody' => 'سُجّل الخطأ. حاول مجدداً بعد لحظات، وتواصل مع الدعم إذا استمر.',
            'offlineTitle' => 'أنت غير متصل', 'offlineBody' => 'تحقق من اتصالك. تغييراتك محفوظة على هذا الجهاز وستُزامَن عند عودتك.',
            'onlineTitle' => 'عاد الاتصال', 'onlineBody' => 'عاد الاتصال بالإنترنت. أعد التحميل لتكمل من حيث توقفت.',
            'maintenanceTitle' => 'نجري بعض أعمال الصيانة', 'maintenanceBody' => 'الخدمة غير متاحة لفترة وجيزة أثناء تحسينها.', 'maintenanceEta' => 'العودة المتوقعة',
            'forbiddenTitle' => 'ليست لديك صلاحية لهذه الصفحة', 'forbiddenBody' => 'حسابك لا يملك إذن رؤية هذا المحتوى. اطلب الصلاحية من مسؤول مساحة العمل.',
            'workspaceTitle' => 'مساحة العمل هذه غير موجودة', 'workspaceBody' => 'قد يكون عنوان مساحة العمل خاطئاً، أو قد أُزيلت منها.', 'workspaceNamed' => 'لا توجد مساحة عمل باسم {name}.',
            'soonTitle' => 'قريباً', 'soonBody' => 'ما زلنا نبني هذا الجزء. سيظهر هنا عندما يجهز.', 'soonNamed' => '{name} قريباً',
        ],
    ];
    $t = array_merge($words[$ar ? 'ar' : 'en'], $labels);
    $icons = ['not-found' => 'file-question', 'server-error' => 'server-crash', 'offline' => 'wifi-off', 'maintenance' => 'wrench', 'forbidden' => 'shield-x', 'unknown-workspace' => 'building-2', 'coming-soon' => 'hourglass'];
    $codes = ['not-found' => '404', 'server-error' => '500', 'forbidden' => '403', 'maintenance' => '503'];
    $shownCode = $code === true ? ($codes[$kind] ?? null) : ($code === false ? null : $code);
    $offline = $kind === 'offline';
    [$heading, $body] = match ($kind) {
        'not-found' => [$t['notFoundTitle'], $t['notFoundBody']],
        'server-error' => [$t['serverTitle'], $t['serverBody']],
        'offline' => $online ? [$t['onlineTitle'], $t['onlineBody']] : [$t['offlineTitle'], $t['offlineBody']],
        'maintenance' => [$t['maintenanceTitle'], $t['maintenanceBody']],
        'forbidden' => [$t['forbiddenTitle'], $t['forbiddenBody']],
        'unknown-workspace' => [$t['workspaceTitle'], $workspace ? str_replace('{name}', $workspace, $t['workspaceNamed']) : $t['workspaceBody']],
        default => [$moduleName ? str_replace('{name}', $moduleName, $t['soonNamed']) : $t['soonTitle'], $t['soonBody']],
    };
    $tone = $kind === 'server-error' ? 'text-nq-danger-text' : ($kind === 'maintenance' ? 'text-nq-warning-text' : ($offline ? ($online ? 'text-nq-success-text' : 'text-nq-warning-text') : 'text-muted-foreground'));
@endphp
<main data-slot="error-page" data-kind="{{ $kind }}" x-data="nqErrorPage({{ $online ? 'true' : 'false' }}, {{ $offline ? 'true' : 'false' }})"
    {{ $attributes->cn(['flex flex-col items-center justify-center gap-8 bg-background p-6 text-center text-foreground', 'min-h-dvh' => $fullScreen]) }}>
    @if ($logo instanceof \Illuminate\View\ComponentSlot && ! $logo->isEmpty())
        {{ $logo }}
    @elseif ($logo !== false)
        <x-nq::product-mark.logo :size="24" />
    @endif
    <div class="flex max-w-md flex-col items-center gap-4">
        <span aria-hidden="true" @if ($offline) x-bind:class="online ? 'text-nq-success-text' : 'text-nq-warning-text'" @endif
            class="inline-flex size-12 items-center justify-center rounded-card border border-border bg-card [&_svg]:size-6 {{ $offline ? '' : $tone }}">
            @if ($offline)
                <x-lucide-wifi-off x-show="!online" @if ($online) style="display: none" @endif />
                <x-lucide-circle-check x-show="online" @if (! $online) style="display: none" @endif />
            @else
                <x-dynamic-component :component="'lucide-'.$icons[$kind]" />
            @endif
        </span>
        @if ($shownCode)
            <p dir="ltr" data-slot="error-page-code" class="text-display font-mono text-muted-foreground/60">{{ $shownCode }}</p>
        @endif
        <div class="flex flex-col gap-2" @if ($kind === 'server-error') role="alert" @endif>
            @if ($offline && $title === null)
                <h1 class="text-h2 text-foreground" data-online-text="{{ $t['onlineTitle'] }}" data-offline-text="{{ $t['offlineTitle'] }}" x-text="online ? $el.dataset.onlineText : $el.dataset.offlineText">{{ $heading }}</h1>
            @else
                <h1 class="text-h2 text-foreground">{{ $title ?? $heading }}</h1>
            @endif
            @if ($offline && $description === null)
                <p class="text-body text-muted-foreground" data-online-text="{{ $t['onlineBody'] }}" data-offline-text="{{ $t['offlineBody'] }}" x-text="online ? $el.dataset.onlineText : $el.dataset.offlineText">{{ $body }}</p>
            @else
                <p class="text-body text-muted-foreground">{{ $description ?? $body }}</p>
            @endif
        </div>
        @if ($kind === 'maintenance' && $eta !== null)
            <p class="text-body-sm text-muted-foreground">
                {{ $t['maintenanceEta'] }}: <x-nq::numeric.date-time :value="$eta" date-style="medium" time-style="short" class="text-foreground" />
            </p>
        @endif
        @if ($kind === 'server-error' && $errorId)
            <p class="flex items-center gap-1 text-caption text-muted-foreground">
                {{ $t['errorId'] }}
                <bdi dir="ltr" class="font-mono text-foreground">{{ $errorId }}</bdi>
                <x-nq::copy-button :value="$errorId" :label="$t['copyId']" variant="ghost" size="icon-sm" />
            </p>
        @endif
        @if ($kind === 'coming-soon' && $notify)
            <p role="status" x-show="notified" style="display: none" class="flex items-center gap-1.5 text-body-sm text-nq-success-text">
                <x-lucide-circle-check aria-hidden="true" class="size-4" />
                {{ $t['notified'] }}
            </p>
        @endif
    </div>
    <div class="flex flex-wrap items-center justify-center gap-2">
        @if (isset($actions) && trim((string) $actions) !== '')
            {{ $actions }}
        @else
            @if ($kind === 'not-found')
                @if ($homeHref)<x-nq::button variant="primary" :href="$homeHref">{{ $t['home'] }}</x-nq::button>@endif
                @if ($back)
                    <x-nq::button variant="secondary" x-on:click="back()"><x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />{{ $t['back'] }}</x-nq::button>
                @endif
            @elseif ($kind === 'server-error')
                @if ($retry)
                    <x-nq::button variant="primary" x-bind="busyBtn('retry')" x-on:click="run('retry')"><x-nq::spinner x-show="busy === 'retry'" style="display: none" /><x-lucide-rotate-cw aria-hidden="true" />{{ $t['retry'] }}</x-nq::button>
                @endif
                @if ($homeHref)<x-nq::button variant="secondary" :href="$homeHref">{{ $t['home'] }}</x-nq::button>@endif
                @if ($supportHref)<x-nq::button variant="ghost" :href="$supportHref">{{ $t['support'] }}</x-nq::button>@endif
            @elseif ($offline)
                @if ($retry)
                    <x-nq::button variant="primary" x-bind="busyBtn('retry')" x-on:click="run('retry')"><x-nq::spinner x-show="busy === 'retry'" style="display: none" /><x-lucide-rotate-cw aria-hidden="true" /><span data-reload="{{ $t['reload'] }}" data-retry="{{ $t['retry'] }}" x-text="online ? $el.dataset.reload : $el.dataset.retry">{{ $online ? $t['reload'] : $t['retry'] }}</span></x-nq::button>
                @endif
            @elseif ($kind === 'maintenance')
                @if ($retry)
                    <x-nq::button variant="primary" x-bind="busyBtn('retry')" x-on:click="run('retry')"><x-nq::spinner x-show="busy === 'retry'" style="display: none" /><x-lucide-rotate-cw aria-hidden="true" />{{ $t['retry'] }}</x-nq::button>
                @endif
                @if ($supportHref)<x-nq::button variant="ghost" :href="$supportHref">{{ $t['support'] }}</x-nq::button>@endif
            @elseif ($kind === 'forbidden')
                @if ($requestAccess)
                    <x-nq::button variant="primary" x-bind="busyBtn('access')" x-on:click="run('access')"><x-nq::spinner x-show="busy === 'access'" style="display: none" />{{ $t['requestAccess'] }}</x-nq::button>
                @endif
                @if ($homeHref)<x-nq::button variant="secondary" :href="$homeHref">{{ $t['home'] }}</x-nq::button>@endif
            @elseif ($kind === 'unknown-workspace')
                @if ($switchWorkspaceHref)<x-nq::button variant="primary" :href="$switchWorkspaceHref">{{ $t['switchWorkspace'] }}</x-nq::button>@endif
                @if ($homeHref)<x-nq::button variant="secondary" :href="$homeHref">{{ $t['home'] }}</x-nq::button>@endif
                @if ($supportHref)<x-nq::button variant="ghost" :href="$supportHref">{{ $t['support'] }}</x-nq::button>@endif
            @else
                @if ($notify)
                    <x-nq::button variant="primary" x-show="!notified" x-bind="busyBtn('notify')" x-on:click="run('notify')"><x-nq::spinner x-show="busy === 'notify'" style="display: none" />{{ $t['notify'] }}</x-nq::button>
                @endif
                @if ($homeHref)
                    @if ($notify)
                        <x-nq::button variant="secondary" :href="$homeHref" x-show="!notified">{{ $t['home'] }}</x-nq::button>
                        <x-nq::button variant="primary" :href="$homeHref" x-show="notified" style="display: none">{{ $t['home'] }}</x-nq::button>
                    @else
                        <x-nq::button variant="primary" :href="$homeHref">{{ $t['home'] }}</x-nq::button>
                    @endif
                @endif
            @endif
        @endif
    </div>
</main>

{{-- <x-nq::data-privacy :request="$latestExport" can-request can-download poll :includes="['Profile','Files']" :scheduled-for="$account->delete_at" :grace-days="30" :confirm-text="$account->email"
         x-on:request-export="$event.detail.wait(api.requestExport())" x-on:download-export="$event.detail.wait(open($event.detail.request.url))" />
     The privacy page of account settings: export your data, then delete your account with a grace period. Needs the Alpine runtime (@nasaqScripts).
     request: the latest export { id, status (queued | processing | ready | failed | expired), requestedAt, completedAt?, expiresAt?, sizeBytes?, progress? (0..1) } or null.
     can-request shows the Request button; can-download shows Download on ready exports; poll follows a queued or processing export.
     scheduled-for: when the account will be deleted (a date string), or null. grace-days (30), confirm-text (what to type), now (clock for the countdown), labels (string overrides).
     Events on the root, each with detail.wait(promise): request-export (resolve { request } or { error }), poll-export { id } (resolve the request),
     download-export { request }, schedule-deletion (resolve nothing or { scheduledFor }), cancel-deletion (resolve nothing or { error }).
     A rejected promise, or no listener, shows the generic error. --}}
@props(['request' => null, 'canRequest' => false, 'canDownload' => false, 'poll' => false, 'pollInterval' => 3000, 'includes' => [], 'scheduledFor' => null, 'graceDays' => 30, 'confirmText' => '', 'now' => null, 'labels' => []])
@php
$S = [
    'en' => [
        'exportTitle' => 'Export your data',
        'exportBody' => 'Get a copy of everything we hold about you, as a file you can keep or move elsewhere.',
        'includes' => 'The file includes',
        'request' => 'Request export',
        'requesting' => 'Requesting',
        'status' => ['queued' => 'Waiting in line', 'processing' => 'Preparing your file', 'ready' => 'Ready to download', 'failed' => 'Failed', 'expired' => 'Expired'],
        'requestedAt' => 'Requested',
        'readyAt' => 'Ready',
        'size' => 'Size',
        'expiresAt' => 'Download available until',
        'download' => 'Download',
        'downloading' => 'Downloading',
        'requestAgain' => 'Request a new export',
        'retryCheck' => 'Check again',
        'emailNote' => 'We also email you when it is ready. This can take a few minutes.',
        'failedBody' => 'The export could not be prepared. Try again.',
        'expiredBody' => 'This export is no longer available. Request a new one.',
        'checkFailed' => 'We could not check the status. It may still be running.',
        'requestFailed' => 'The export could not be requested. Try again.',
        'downloadFailed' => 'The download did not start. Try again.',
        'progressLabel' => 'Export progress',
        'deleteTitle' => 'Delete account',
        'deleteHeading' => 'Delete your account',
        'deleteBody' => 'Your account and its data are permanently deleted after {days} days. Until then you can sign in and cancel.',
        'deleteButton' => 'Delete my account',
        'deleteConfirmTitle' => 'Delete your account?',
        'deleteConfirmBody' => 'You are signed out everywhere. After {days} days everything is removed for good. You can cancel any time before then.',
        'deletePrompt' => 'Type {text} to confirm',
        'deleteAction' => 'Schedule deletion',
        'cancel' => 'Cancel',
        'deleteFailed' => 'The deletion could not be scheduled. Try again.',
        'scheduledTitle' => 'Your account is scheduled for deletion',
        'scheduledOn' => 'It will be deleted on',
        'daysLeft' => '{n} days left',
        'lessThanDay' => 'Less than a day left',
        'scheduledBody' => 'Everything is removed for good on that date. Cancel now to keep your account exactly as it is.',
        'cancelDeletion' => 'Cancel deletion',
        'cancelling' => 'Cancelling',
        'cancelFailed' => 'Deletion could not be cancelled. Try again.',
        'cancelledOk' => 'Deletion cancelled. Your account stays as it was.',
        'dueTitle' => 'Your account is being deleted',
        'dueBody' => 'The grace period has ended. It can no longer be cancelled here. Contact support if this is a mistake.',
        'graceProgress' => 'Grace period used',
        'pageReadyTitle' => 'Keep your account?',
        'pageReadyBody' => 'Your account is scheduled for deletion on {date}. Cancel it and nothing is lost.',
        'keep' => 'Keep my account',
        'pageDoneTitle' => 'Your account is safe',
        'pageDoneBody' => 'The deletion was cancelled. You can sign in as usual.',
        'pageExpiredTitle' => 'This account has been deleted',
        'pageExpiredBody' => 'The grace period ended and the data was removed. It cannot be recovered. You can create a new account any time.',
        'pageInvalidTitle' => 'This link does not work',
        'pageInvalidBody' => 'It may be wrong, already used, or from an older request. Sign in to check your account.',
        'signIn' => 'Sign in',
        'signUp' => 'Create a new account',
        'goHome' => 'Go to the home page',
    ],
    'ar' => [
        'exportTitle' => 'صدّر بياناتك',
        'exportBody' => 'احصل على نسخة من كل ما نحتفظ به عنك، في ملف تحتفظ به أو تنقله إلى مكان آخر.',
        'includes' => 'يتضمن الملف',
        'request' => 'طلب التصدير',
        'requesting' => 'جارٍ الطلب',
        'status' => ['queued' => 'في الانتظار', 'processing' => 'جارٍ تجهيز ملفك', 'ready' => 'جاهز للتنزيل', 'failed' => 'فشل', 'expired' => 'منتهي'],
        'requestedAt' => 'تاريخ الطلب',
        'readyAt' => 'تاريخ الجاهزية',
        'size' => 'الحجم',
        'expiresAt' => 'التنزيل متاح حتى',
        'download' => 'تنزيل',
        'downloading' => 'جارٍ التنزيل',
        'requestAgain' => 'طلب تصدير جديد',
        'retryCheck' => 'تحقق مرة أخرى',
        'emailNote' => 'سنراسلك أيضًا عندما يجهز. قد يستغرق ذلك بضع دقائق.',
        'failedBody' => 'تعذّر تجهيز التصدير. حاول مرة أخرى.',
        'expiredBody' => 'لم يعد هذا التصدير متاحًا. اطلب تصديرًا جديدًا.',
        'checkFailed' => 'تعذّر التحقق من الحالة. قد يكون ما زال قيد التنفيذ.',
        'requestFailed' => 'تعذّر طلب التصدير. حاول مرة أخرى.',
        'downloadFailed' => 'لم يبدأ التنزيل. حاول مرة أخرى.',
        'progressLabel' => 'تقدّم التصدير',
        'deleteTitle' => 'حذف الحساب',
        'deleteHeading' => 'احذف حسابك',
        'deleteBody' => 'يُحذف حسابك وبياناته نهائيًا بعد {days} يومًا. حتى ذلك الحين يمكنك تسجيل الدخول والإلغاء.',
        'deleteButton' => 'احذف حسابي',
        'deleteConfirmTitle' => 'حذف حسابك؟',
        'deleteConfirmBody' => 'يتم تسجيل خروجك من كل مكان. بعد {days} يومًا يُزال كل شيء نهائيًا. يمكنك الإلغاء في أي وقت قبل ذلك.',
        'deletePrompt' => 'اكتب {text} للتأكيد',
        'deleteAction' => 'جدولة الحذف',
        'cancel' => 'إلغاء',
        'deleteFailed' => 'تعذّرت جدولة الحذف. حاول مرة أخرى.',
        'scheduledTitle' => 'حسابك مجدول للحذف',
        'scheduledOn' => 'سيُحذف في',
        'daysLeft' => 'بقي {n} أيام',
        'lessThanDay' => 'بقي أقل من يوم',
        'scheduledBody' => 'يُزال كل شيء نهائيًا في ذلك التاريخ. ألغِ الآن لتبقى حسابك كما هو تمامًا.',
        'cancelDeletion' => 'إلغاء الحذف',
        'cancelling' => 'جارٍ الإلغاء',
        'cancelFailed' => 'تعذّر إلغاء الحذف. حاول مرة أخرى.',
        'cancelledOk' => 'أُلغي الحذف. يبقى حسابك كما كان.',
        'dueTitle' => 'جارٍ حذف حسابك',
        'dueBody' => 'انتهت فترة السماح ولم يعد ممكنًا الإلغاء من هنا. تواصل مع الدعم إن كان ذلك خطأ.',
        'graceProgress' => 'المستهلك من فترة السماح',
        'pageReadyTitle' => 'هل تريد الإبقاء على حسابك؟',
        'pageReadyBody' => 'حسابك مجدول للحذف في {date}. ألغِ الحذف ولن يضيع شيء.',
        'keep' => 'أبقِ على حسابي',
        'pageDoneTitle' => 'حسابك في أمان',
        'pageDoneBody' => 'أُلغي الحذف. يمكنك تسجيل الدخول كالمعتاد.',
        'pageExpiredTitle' => 'تم حذف هذا الحساب',
        'pageExpiredBody' => 'انتهت فترة السماح وأُزيلت البيانات. لا يمكن استعادتها. يمكنك إنشاء حساب جديد في أي وقت.',
        'pageInvalidTitle' => 'هذا الرابط لا يعمل',
        'pageInvalidBody' => 'قد يكون خاطئًا أو مستخدمًا من قبل أو من طلب أقدم. سجّل الدخول لتتحقق من حسابك.',
        'signIn' => 'تسجيل الدخول',
        'signUp' => 'إنشاء حساب جديد',
        'goHome' => 'الذهاب إلى الصفحة الرئيسية',
    ],
];
    $ar = \Nasaq\Nasaq::rtl();
    $locale = $ar ? 'ar' : 'en';
    $T = array_merge($S[$locale], (array) $labels);
    $T['daysLeftOne'] = $ar ? 'بقي يوم واحد' : '1 day left';
    $clock = new \DateTimeImmutable($now ?? 'now');
    $date = fn ($v) => $v ? new \DateTimeImmutable(is_string($v) ? $v : $v->format('c')) : null;
    $fmt = function ($v, $kind) use ($locale) {
        $d = $v ? (is_string($v) ? new \DateTimeImmutable($v) : $v) : null;
        if (! $d) return '';
        if (! class_exists(\IntlDateFormatter::class)) return $d->format($kind === 'dt' ? 'M j, Y, g:i A' : 'M j, Y');
        $dateStyle = $kind === 'long' ? \IntlDateFormatter::LONG : \IntlDateFormatter::MEDIUM;
        $timeStyle = $kind === 'dt' ? \IntlDateFormatter::SHORT : \IntlDateFormatter::NONE;
        return (new \IntlDateFormatter($locale.'@numbers=latn', $dateStyle, $timeStyle, date_default_timezone_get()))->format($d);
    };
    $iso = fn ($v) => $v ? (is_string($v) ? (new \DateTimeImmutable($v))->format('c') : $v->format('c')) : null;
    $req = $request ? array_merge($request, [
        'requestedAt' => $iso($request['requestedAt'] ?? null),
        'completedAt' => $iso($request['completedAt'] ?? null),
        'expiresAt' => $iso($request['expiresAt'] ?? null),
    ]) : null;
    $status = $req['status'] ?? '';
    $due = $date($scheduledFor);
    $phase = ! $due ? 'none' : ($due > $clock ? 'pending' : 'due');
    $left = $due ? max(0, (int) ceil(($due->getTimestamp() - $clock->getTimestamp()) / 86400)) : 0;
    $leftText = $left <= 1 ? $T['lessThanDay'] : str_replace('{n}', (string) $left, $T['daysLeft']);
    $total = $graceDays * 86400;
    $elapsed = $due && $total > 0 ? (int) round(min(1, max(0, 1 - ($due->getTimestamp() - $clock->getTimestamp()) / $total)) * 100) : 100;
    $days = (string) $graceDays;
    $tones = ['queued' => 'info', 'processing' => 'info', 'ready' => 'success', 'failed' => 'danger', 'expired' => 'neutral'];
    $icons = ['queued' => 'refresh-cw', 'processing' => 'refresh-cw', 'ready' => 'circle-check', 'failed' => 'circle-alert', 'expired' => 'clock'];
    $sizeText = '';
    if (! empty($req['sizeBytes'])) {
        $units = $ar ? ['ب', 'ك.ب', 'م.ب', 'ج.ب', 'ت.ب'] : ['B', 'KB', 'MB', 'GB', 'TB'];
        $v = $req['sizeBytes']; $i = 0;
        while ($v >= 1024 && $i < count($units) - 1) { $v /= 1024; $i++; }
        $sizeText = rtrim(rtrim(number_format($v, $i === 0 ? 0 : 1, '.', ','), '0'), '.').' '.$units[$i];
    }
    $pct = isset($req['progress']) ? (int) round($req['progress'] * 100) : null;
    $config = [
        'request' => $req, 'canRequest' => (bool) $canRequest, 'canDownload' => (bool) $canDownload, 'poll' => (bool) $poll, 'interval' => $pollInterval,
        'scheduledFor' => $iso($scheduledFor), 'graceDays' => $graceDays, 'now' => $now ? $clock->format('c') : null, 'locale' => $locale, 'labels' => $T,
    ];
    $dangerLabels = [
        'button' => $T['deleteButton'], 'confirmTitle' => $T['deleteConfirmTitle'], 'confirmDescription' => str_replace('{days}', $days, $T['deleteConfirmBody']),
        'confirmPrompt' => $T['deletePrompt'], 'confirmAction' => $T['deleteAction'], 'cancel' => $T['cancel'], 'failed' => $T['deleteFailed'],
    ];
    $hide = 'style="display: none"';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'data-privacy') }}" x-data="nqDataPrivacy(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    {{-- Export --}}
    <x-nq::account-settings.settings-section data-slot="data-export" data-status="{{ $status ?: 'none' }}" x-bind:data-status="status || 'none'" :title="$T['exportTitle']" :description="$T['exportBody']">
        @if ($canRequest)
            <x-slot:action>
                <x-nq::button variant="primary" x-show="canAsk" :style="$req && ! in_array($status, ['failed', 'expired']) ? 'display: none' : null" x-on:click="ask()" x-bind:disabled="busy === 'request'" x-bind:aria-busy="busy === 'request' ? 'true' : null">
                    <template x-if="busy === 'request'"><x-nq::spinner /></template>
                    <x-lucide-file-archive aria-hidden="true" />
                    <span x-text="req ? config.labels.requestAgain : config.labels.request">{{ $req ? $T['requestAgain'] : $T['request'] }}</span>
                </x-nq::button>
            </x-slot:action>
        @endif
        <div class="flex flex-col gap-4">
            @if (count($includes))
                <div class="flex flex-col gap-1.5">
                    <span class="text-label text-foreground">{{ $T['includes'] }}</span>
                    <ul class="list-disc ps-5 text-body-sm text-muted-foreground">
                        @foreach ($includes as $line)<li>{{ $line }}</li>@endforeach
                    </ul>
                </div>
            @endif

            <template x-if="error">
                <x-nq::alert tone="danger" role="alert" dismissible x-on:nq:dismiss="error = null"><span x-text="error"></span></x-nq::alert>
            </template>

            <div class="flex flex-col gap-3 rounded-card border border-border p-4" data-slot="data-export-status" x-show="req" @if (! $req) {!! $hide !!} @endif>
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-2" role="status" aria-live="polite">
                        @foreach ($tones as $s => $tone)
                            <x-nq::badge :variant="$tone" x-show="status === '{{ $s }}'" :style="$status === $s ? null : 'display: none'">
                                <x-dynamic-component :component="'lucide-'.$icons[$s]" aria-hidden="true" :class="in_array($s, ['queued', 'processing'], true) ? 'motion-safe:animate-spin' : null" />
                                <span x-text="statusLabel">{{ $status === $s ? $T['status'][$s] : '' }}</span>
                            </x-nq::badge>
                        @endforeach
                    </div>
                    @if ($canDownload)
                        <x-nq::button variant="primary" x-show="canDownload" :style="$status === 'ready' ? null : 'display: none'" x-on:click="download()" x-bind:disabled="busy === 'download'" x-bind:aria-busy="busy === 'download' ? 'true' : null">
                            <template x-if="busy === 'download'"><x-nq::spinner /></template>
                            <x-lucide-download aria-hidden="true" />
                            {{ $T['download'] }}
                            <span class="opacity-80" x-show="sizeText" @if (! $sizeText) {!! $hide !!} @endif>(<bdi dir="ltr" x-text="sizeText">{{ $sizeText }}</bdi>)</span>
                        </x-nq::button>
                    @endif
                </div>

                <div class="flex flex-col gap-3" x-show="isActive" @if (! in_array($status, ['queued', 'processing'], true)) {!! $hide !!} @endif>
                    <div data-slot="progress" role="progressbar" aria-label="{{ $T['progressLabel'] }}" aria-valuemin="0" aria-valuemax="100"
                        x-bind:aria-valuenow="progressValue" x-bind:data-indeterminate="progressValue === null ? '' : null" class="flex w-full flex-col gap-1.5">
                        <div class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                            <div class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none"
                                x-bind:class="progressValue === null ? 'w-full motion-safe:animate-pulse' : ''"
                                x-bind:style="progressValue === null ? '' : 'width:' + progressValue + '%'" style="inset-inline-start:0;@if ($pct !== null)width:{{ $pct }}%@endif"></div>
                        </div>
                    </div>
                    <p class="text-caption text-muted-foreground">{{ $T['emailNote'] }}</p>
                </div>
                <p class="text-body-sm text-nq-danger-text" x-show="status === 'failed'" @if ($status !== 'failed') {!! $hide !!} @endif>{{ $T['failedBody'] }}</p>
                <p class="text-body-sm text-muted-foreground" x-show="status === 'expired'" @if ($status !== 'expired') {!! $hide !!} @endif>{{ $T['expiredBody'] }}</p>
                <x-nq::alert tone="warning" x-show="stalled" style="display: none">
                    {{ $T['checkFailed'] }}
                    <x-slot:action><x-nq::button size="sm" variant="secondary" x-on:click="recheck()">{{ $T['retryCheck'] }}</x-nq::button></x-slot:action>
                </x-nq::alert>

                <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-body-sm">
                    <dt class="text-muted-foreground">{{ $T['requestedAt'] }}</dt>
                    <dd><time class="tabular-nums [unicode-bidi:isolate]" dir="auto" x-bind:datetime="req ? req.requestedAt : null" x-text="fmt(req ? req.requestedAt : null, 'dt')" datetime="{{ $req['requestedAt'] ?? '' }}">{{ $fmt($req['requestedAt'] ?? null, 'dt') }}</time></dd>
                    <dt class="text-muted-foreground" x-show="showReady" @if ($status !== 'ready' || empty($req['completedAt'])) {!! $hide !!} @endif>{{ $T['readyAt'] }}</dt>
                    <dd x-show="showReady" @if ($status !== 'ready' || empty($req['completedAt'])) {!! $hide !!} @endif><time class="tabular-nums [unicode-bidi:isolate]" dir="auto" x-text="fmt(req ? req.completedAt : null, 'dt')" datetime="{{ $req['completedAt'] ?? '' }}">{{ $fmt($req['completedAt'] ?? null, 'dt') }}</time></dd>
                    <dt class="text-muted-foreground" x-show="showReady" @if ($status !== 'ready' || empty($req['expiresAt'])) {!! $hide !!} @endif>{{ $T['expiresAt'] }}</dt>
                    <dd x-show="showReady" @if ($status !== 'ready' || empty($req['expiresAt'])) {!! $hide !!} @endif><time class="tabular-nums [unicode-bidi:isolate]" dir="auto" x-text="fmt(req ? req.expiresAt : null, 'd')" datetime="{{ $req['expiresAt'] ?? '' }}">{{ $fmt($req['expiresAt'] ?? null, 'd') }}</time></dd>
                </dl>
            </div>
        </div>
    </x-nq::account-settings.settings-section>

    {{-- Deletion: none --}}
    <div data-slot="account-deletion" data-phase="none" class="flex flex-col gap-4" x-show="phase === 'none'" @if ($phase !== 'none') {!! $hide !!} @endif
        x-on:nq-account-delete="$event.detail.waitUntil(schedule())">
        <template x-if="notice">
            <x-nq::alert tone="success" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
        </template>
        <x-nq::account-settings.danger-zone :title="$T['deleteTitle']" :heading="$T['deleteHeading']" :description="str_replace('{days}', $days, $T['deleteBody'])" :confirm-text="$confirmText" :labels="$dangerLabels" />
    </div>

    {{-- Deletion: pending --}}
    <x-nq::account-settings.settings-section data-slot="account-deletion" data-phase="pending" tone="danger" :title="$T['scheduledTitle']" x-show="phase === 'pending'" :style="$phase === 'pending' ? null : 'display: none'">
        <div class="flex flex-col gap-4">
            <x-nq::alert tone="warning" icon="triangle-alert">
                <span>{{ $T['scheduledOn'] }} <time class="tabular-nums [unicode-bidi:isolate]" dir="auto" x-bind:datetime="date" x-text="fmt(date, 'long')" datetime="{{ $iso($scheduledFor) }}">{{ $fmt($due, 'long') }}</time> · <strong x-text="leftText">{{ $leftText }}</strong></span>
            </x-nq::alert>
            <div data-slot="progress" role="progressbar" aria-label="{{ $T['graceProgress'] }}" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="elapsed" aria-valuenow="{{ $elapsed }}" class="flex w-full flex-col gap-1.5">
                <div class="flex items-baseline justify-between gap-3 text-body-sm"><span class="text-label text-foreground">{{ $T['graceProgress'] }}</span><span aria-hidden="true" class="text-muted-foreground tabular-nums" x-text="elapsed + '%'">{{ $elapsed }}%</span></div>
                <div class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                    <div class="block h-full rounded-full bg-nq-warning transition-[width] duration-300 ease-nq motion-reduce:transition-none" x-bind:style="'width:' + elapsed + '%'" style="inset-inline-start:0;width:{{ $elapsed }}%"></div>
                </div>
            </div>
            <p class="text-body-sm text-muted-foreground">{{ $T['scheduledBody'] }}</p>
            <div>
                <x-nq::button variant="primary" x-on:click="cancel()" x-bind:disabled="cancelBusy" x-bind:aria-busy="cancelBusy ? 'true' : null">
                    <template x-if="cancelBusy"><x-nq::spinner /></template>
                    <x-lucide-shield-check aria-hidden="true" />
                    {{ $T['cancelDeletion'] }}
                </x-nq::button>
            </div>
            <template x-if="notice">
                <x-nq::alert tone="danger" role="alert" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
            </template>
        </div>
    </x-nq::account-settings.settings-section>

    {{-- Deletion: due --}}
    <x-nq::account-settings.settings-section data-slot="account-deletion" data-phase="due" tone="danger" :title="$T['dueTitle']" x-show="phase === 'due'" :style="$phase === 'due' ? null : 'display: none'">
        <p class="text-body-sm text-muted-foreground">{{ $T['dueBody'] }}</p>
    </x-nq::account-settings.settings-section>
</div>

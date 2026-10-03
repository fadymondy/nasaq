{{-- <x-nq::data-privacy.cancel-page state="ready" :account="['name' => 'Sara', 'email' => 'sara@x.com']" scheduled-for="2026-10-14" sign-in-href="/sign-in"
         x-on:cancel-deletion="$event.detail.wait(api.cancelWithToken(token))" />
     The public page behind the link in the "your account is scheduled for deletion" email. One button keeps the account. Needs the Alpine runtime (@nasaqScripts).
     state: ready (grace period runs) | cancelled | expired | invalid, resolved on the server. account: { name, email, avatar? }. scheduled-for: the date.
     sign-in-href, sign-up-href, home-href show the matching buttons. bare drops the page frame (the auth layout); variant: card | split, backdrop: false hides the scene.
     Event on the root: cancel-deletion, with detail.wait(promise); resolve nothing to keep the account, { error } to show it. A rejection, or no listener, shows the generic error. --}}
@props(['state' => 'ready', 'account' => null, 'scheduledFor' => null, 'signInHref' => null, 'signUpHref' => null, 'homeHref' => null, 'bare' => false, 'variant' => 'card', 'backdrop' => true, 'labels' => []])
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
    $dateText = '';
    if ($scheduledFor) {
        $d = is_string($scheduledFor) ? new \DateTimeImmutable($scheduledFor) : $scheduledFor;
        $dateText = class_exists(\IntlDateFormatter::class)
            ? (new \IntlDateFormatter($locale.'@numbers=latn', \IntlDateFormatter::LONG, \IntlDateFormatter::NONE, date_default_timezone_get()))->format($d)
            : $d->format('F j, Y');
    }
    $copy = [
        'ready' => [$T['pageReadyTitle'], str_replace('{date}', $dateText, $T['pageReadyBody'])],
        'cancelled' => [$T['pageDoneTitle'], $T['pageDoneBody']],
        'expired' => [$T['pageExpiredTitle'], $T['pageExpiredBody']],
        'invalid' => [$T['pageInvalidTitle'], $T['pageInvalidBody']],
    ];
    $state = isset($copy[$state]) ? $state : 'invalid';
    $config = ['state' => $state, 'dateText' => $dateText, 'labels' => $T];
    $glyphs = ['cancelled' => ['circle-check', 'bg-nq-success-soft text-nq-success-text'], 'expired' => ['clock', 'bg-secondary text-muted-foreground'], 'invalid' => ['circle-alert', 'bg-nq-warning-soft text-nq-warning-text']];
@endphp
@php ob_start(); @endphp
<section data-slot="{{ $attributes->get('data-slot', 'cancel-deletion-page') }}" data-state="{{ $state }}" x-bind:data-state="shown" x-data="nqCancelDeletion(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <header class="flex flex-col gap-1.5 {{ $bare ? '' : 'items-center text-center' }}">
        <h1 class="text-h2 text-foreground" x-text="title">{{ $copy[$state][0] }}</h1>
        <p class="text-body-sm text-muted-foreground" x-text="description">{{ $copy[$state][1] }}</p>
    </header>
    <div class="flex flex-col gap-4">
        @foreach ($glyphs as $s => [$icon, $tone])
            <div class="mx-auto flex size-12 items-center justify-center rounded-full [&_svg]:size-6 {{ $tone }}" aria-hidden="true" x-show="shown === '{{ $s }}'" @if ($state !== $s) style="display: none" @endif>
                <x-dynamic-component :component="'lucide-'.$icon" />
            </div>
        @endforeach

        <div class="flex flex-col gap-4" x-show="shown === 'ready'" @if ($state !== 'ready') style="display: none" @endif>
            @if ($account)
                <div class="flex items-center gap-3 rounded-card border border-border p-3">
                    <x-nq::avatar :name="$account['name']" :src="$account['avatar'] ?? null" />
                    <div class="flex min-w-0 flex-col">
                        <span class="truncate text-label text-foreground">{{ $account['name'] }}</span>
                        <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ $account['email'] }}</bdi>
                    </div>
                </div>
            @endif
            <x-nq::button variant="primary" x-on:click="keep()" x-bind:disabled="busy" x-bind:aria-busy="busy ? 'true' : null">
                <template x-if="busy"><x-nq::spinner /></template>
                <x-lucide-shield-check aria-hidden="true" />
                {{ $T['keep'] }}
            </x-nq::button>
        </div>

        @if ($signInHref)
            <div class="flex flex-col gap-4" x-show="shown === 'cancelled' || shown === 'invalid'" @if (! in_array($state, ['cancelled', 'invalid'], true)) style="display: none" @endif>
                <x-nq::button variant="primary" :href="$signInHref">{{ $T['signIn'] }}</x-nq::button>
            </div>
        @endif
        @if ($signUpHref || $homeHref)
            <div class="flex flex-col gap-4" x-show="shown === 'expired'" @if ($state !== 'expired') style="display: none" @endif>
                @if ($signUpHref)<x-nq::button variant="primary" :href="$signUpHref">{{ $T['signUp'] }}</x-nq::button>@endif
                @if ($homeHref)<x-nq::button variant="ghost" :href="$homeHref">{{ $T['goHome'] }}</x-nq::button>@endif
            </div>
        @endif

        <template x-if="error">
            <x-nq::alert tone="danger" role="alert"><span x-text="error"></span></x-nq::alert>
        </template>
    </div>
</section>
@php $body = new \Illuminate\Support\HtmlString(ob_get_clean()); @endphp
@if ($bare){!! $body !!}@else<x-nq::auth-layout :variant="$variant" :backdrop="$backdrop">{!! $body !!}</x-nq::auth-layout>@endif

{{-- <x-nq::device-pairing :request="['code' => 'WDJBMJHT', 'client' => 'Mahaam Desktop', 'deviceName' => 'MacBook Pro', 'platform' => 'macOS 15', 'ip' => '203.0.113.7', 'scopes' => ['Read your projects']]"
         expires-at="2026-09-29T09:10:00" x-on:nq-device-approve="$event.detail.waitUntil(approve())" x-on:nq-device-deny="$event.detail.waitUntil(deny())" />
     The page a signed-in person lands on to approve a device (the React DeviceApproval): the big code to compare, what is asking (device,
     platform, browser, IP, place, time, scopes), a warning, and Approve or Deny. It shows the outcome afterwards, and turns to "expired" by itself.
     The other pages of the flow are the parts: <x-nq::device-pairing.entry>, <x-nq::device-pairing.display>, <x-nq::device-pairing.handoff>.
     Events (bubble from the card; detail.waitUntil(promise); resolve nothing for success or { error }): nq-device-approve, nq-device-deny. Plain: nq-device-enter-another.
     request: { code, client, deviceName?, platform?, browser?, ip?, location?, requestedAt?, scopes?: [] }. status: pending (default) | approved | denied | expired;
     it is x-modelable, so x-model on the card moves it to the outcome screen. expires-at: when the code stops working (shows a countdown). now: freeze the clock
     (docs, tests). account: { name, email? }. enter-another: shows "Enter another code" on the expired screen. labels: override any string.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['request', 'status' => 'pending', 'expiresAt' => null, 'now' => null, 'account' => null, 'enterAnother' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'title' => $t::t('Approve this device?', 'الموافقة على هذا الجهاز؟'),
        'description' => $t::t('{client} wants to sign in to your account. Check that the code below matches the one on the device.', 'يريد {client} تسجيل الدخول إلى حسابك. تأكد من أن الرمز أدناه يطابق الرمز على الجهاز.'),
        'signedInAs' => $t::t('Signing in as {name}', 'تسجيل الدخول باسم {name}'),
        'code' => $t::t('Code', 'الرمز'),
        'device' => $t::t('Device', 'الجهاز'),
        'platform' => $t::t('Platform', 'المنصة'),
        'browser' => $t::t('Browser', 'المتصفح'),
        'ip' => $t::t('IP address', 'عنوان IP'),
        'location' => $t::t('Location', 'الموقع'),
        'requested' => $t::t('Requested', 'وقت الطلب'),
        'scopes' => $t::t('It will be able to', 'سيتمكن من'),
        'warning' => $t::t('Only approve if you started this yourself. If you do not recognise it, deny it and change your password.', 'وافق فقط إذا كنت أنت من بدأ هذا الطلب. إذا لم تتعرف عليه فارفضه وغيّر كلمة مرورك.'),
        'approve' => $t::t('Approve', 'موافقة'),
        'deny' => $t::t('Deny', 'رفض'),
        'expiresIn' => $t::t('Expires in {time}', 'ينتهي خلال {time}'),
        'approvedTitle' => $t::t('Device approved', 'تمت الموافقة على الجهاز'),
        'approvedDescription' => $t::t('You can go back to the device. It will sign in in a few seconds.', 'يمكنك العودة إلى الجهاز. سيسجّل الدخول خلال ثوانٍ.'),
        'deniedTitle' => $t::t('Request denied', 'تم رفض الطلب'),
        'deniedDescription' => $t::t('The device was not given access. You can close this page.', 'لم يُمنح الجهاز أي وصول. يمكنك إغلاق هذه الصفحة.'),
        'expiredTitle' => $t::t('This code expired', 'انتهت صلاحية هذا الرمز'),
        'expiredDescription' => $t::t('Codes only last a few minutes. Start again on the device to get a new one.', 'الرموز تدوم بضع دقائق فقط. ابدأ من جديد على الجهاز للحصول على رمز جديد.'),
        'another' => $t::t('Enter another code', 'أدخل رمزًا آخر'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $group = fn (string $code): string => implode('-', str_split(preg_replace('/[^A-Z0-9]/', '', strtoupper($code)), 4));
    $req = (array) $request;
    $rows = [
        [$l['device'], $req['deviceName'] ?? null, false],
        [$l['platform'], $req['platform'] ?? null, false],
        [$l['browser'], $req['browser'] ?? null, false],
        [$l['ip'], $req['ip'] ?? null, true],
        [$l['location'], $req['location'] ?? null, false],
    ];
    $config = [
        'status' => $status, 'expiresAt' => $expiresAt instanceof \DateTimeInterface ? $expiresAt->format('Y-m-d\TH:i:s') : $expiresAt,
        'now' => $now instanceof \DateTimeInterface ? $now->format('Y-m-d\TH:i:s') : $now, 'failed' => $l['failed'], 'labels' => $l,
    ];
    $outcomes = [
        'approved' => ['check', 'bg-nq-success-soft text-nq-success-text', $l['approvedTitle'], $l['approvedDescription']],
        'denied' => ['ban', 'bg-nq-danger-soft text-nq-danger-text', $l['deniedTitle'], $l['deniedDescription']],
        'expired' => ['timer-off', 'bg-muted text-muted-foreground', $l['expiredTitle'], $l['expiredDescription']],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'device-approval') }}" x-data="nqDeviceApproval(@js($config))" x-modelable="status" x-bind:data-status="shown()"
    x-bind:aria-busy="pendingKind ? 'true' : null" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground mx-auto w-full max-w-md gap-5 p-6 sm:p-8') }}>
    @foreach ($outcomes as $key => [$icon, $tone, $title, $body])
        <div role="status" class="flex flex-col items-center gap-4 text-center" style="display: none" x-show="is('{{ $key }}')">
            <span class="inline-flex size-12 items-center justify-center rounded-full {{ $tone }}">
                <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" class="size-6" />
            </span>
            <h1 class="text-h2 text-foreground">{{ $title }}</h1>
            <p class="text-body-sm text-muted-foreground">{{ $body }}</p>
            @if ($key === 'expired' && $enterAnother)
                <x-nq::button variant="primary" x-on:click="enterAnother()">{{ $l['another'] }}</x-nq::button>
            @endif
        </div>
    @endforeach
    <div class="flex flex-col gap-5" x-show="is('pending')">
        <header class="flex flex-col gap-1.5">
            <h1 class="text-h2 text-foreground">{{ $l['title'] }}</h1>
            <p class="text-body-sm text-muted-foreground">{{ str_replace('{client}', (string) ($req['client'] ?? ''), $l['description']) }}</p>
            @if ($account)
                <p class="text-caption text-muted-foreground">{{ str_replace('{name}', ! empty($account['email']) ? $account['name'].' ('.$account['email'].')' : $account['name'], $l['signedInAs']) }}</p>
            @endif
        </header>
        <div class="flex flex-col items-center gap-1 rounded-card border border-border bg-muted/50 py-4">
            <span class="text-caption text-muted-foreground">{{ $l['code'] }}</span>
            <span data-slot="device-code" dir="ltr" class="font-mono text-h1 tracking-[0.12em] text-foreground">{{ $group((string) ($req['code'] ?? '')) }}</span>
            <span dir="ltr" class="text-caption text-muted-foreground tabular-nums" style="display: none" x-show="hasExpiry()" x-text="expiresLabel()"></span>
        </div>
        <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
            @foreach ($rows as [$label, $value, $mono])
                @if ($value)
                    <div class="col-span-2 grid grid-cols-subgrid">
                        <dt class="text-muted-foreground">{{ $label }}</dt>
                        <dd class="m-0 text-start text-foreground">@if ($mono)<bdi dir="ltr" class="font-mono">{{ $value }}</bdi>@else{{ $value }}@endif</dd>
                    </div>
                @endif
            @endforeach
            @if (! empty($req['requestedAt']))
                <div class="col-span-2 grid grid-cols-subgrid">
                    <dt class="text-muted-foreground">{{ $l['requested'] }}</dt>
                    <dd class="m-0 text-start text-foreground"><x-nq::numeric.date-time :value="$req['requestedAt']" date-style="medium" time-style="short" /></dd>
                </div>
            @endif
        </dl>
        @if (! empty($req['scopes']))
            <div class="flex flex-col gap-1.5">
                <p class="text-label text-foreground">{{ $l['scopes'] }}</p>
                <ul class="m-0 flex list-disc flex-col gap-0.5 ps-5 text-body-sm text-muted-foreground">
                    @foreach ($req['scopes'] as $scope)
                        <li>{{ $scope }}</li>
                    @endforeach
                </ul>
            </div>
        @endif
        <x-nq::alert tone="warning">{{ $l['warning'] }}</x-nq::alert>
        <x-nq::alert tone="danger" style="display: none" x-show="error"><span x-text="error"></span></x-nq::alert>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <x-nq::button variant="secondary" size="lg" x-on:click="decide('deny')" x-bind:disabled="off('deny')" x-bind:data-disabled="off('deny') ? '' : null" x-bind:aria-busy="pendingKind === 'deny' ? 'true' : null">
                <template x-if="pendingKind === 'deny'"><x-nq::spinner /></template>
                {{ $l['deny'] }}
            </x-nq::button>
            <x-nq::button variant="primary" size="lg" x-on:click="decide('approve')" x-bind:disabled="off('approve')" x-bind:data-disabled="off('approve') ? '' : null" x-bind:aria-busy="pendingKind === 'approve' ? 'true' : null">
                <template x-if="pendingKind === 'approve'"><x-nq::spinner /></template>
                {{ $l['approve'] }}
            </x-nq::button>
        </div>
    </div>
</div>

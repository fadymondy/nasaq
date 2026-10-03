{{-- <x-nq::device-pairing.display code="WDJBMJHT" verification-uri="https://nasaq.app/device" expires-at="2026-09-29T09:10:00" x-on:nq-device-refresh="newCode()" />
     The OAuth device flow, seen from the device asking for access (the React DeviceCodeDisplay): a big copyable code, the address to visit, a
     QR code to skip the typing, and a live state (waiting, approved, denied, expired). Poll your token endpoint and set the state with x-model
     on the card (status is x-modelable). Plain event: nq-device-refresh, from "Get a new code" on the expired state (shown with the refresh attribute).
     code: the user code. verification-uri / verification-uri-complete: the address, and the address with the code (the QR content when set).
     status: pending (default) | approved | denied | expired. expires-at: shows a countdown. now: freeze the clock (docs, tests).
     Slot mark: the host mark above. labels: override any string. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['code', 'verificationUri', 'verificationUriComplete' => null, 'status' => 'pending', 'expiresAt' => null, 'now' => null, 'refresh' => false, 'mark' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'title' => $t::t('Sign in on your phone or computer', 'سجّل الدخول من هاتفك أو حاسوبك'),
        'description' => $t::t('Go to the address below and enter this code, or scan the QR code.', 'افتح العنوان أدناه وأدخل هذا الرمز، أو امسح رمز QR.'),
        'address' => $t::t('Address', 'العنوان'),
        'yourCode' => $t::t('Your code', 'رمزك'),
        'scan' => $t::t('QR code to open the sign-in page', 'رمز QR لفتح صفحة تسجيل الدخول'),
        'waiting' => $t::t('Waiting for approval', 'بانتظار الموافقة'),
        'expiresIn' => $t::t('Expires in {time}', 'ينتهي خلال {time}'),
        'approvedDevice' => $t::t('Approved. Signing you in', 'تمت الموافقة. جارٍ تسجيل دخولك'),
        'deniedDevice' => $t::t('The request was denied.', 'تم رفض الطلب.'),
        'expiredTitle' => $t::t('This code expired', 'انتهت صلاحية هذا الرمز'),
        'refresh' => $t::t('Get a new code', 'احصل على رمز جديد'),
    ], (array) $labels);
    $grouped = implode('-', str_split(preg_replace('/[^A-Z0-9]/', '', strtoupper((string) $code)), 4));
    $config = [
        'status' => $status, 'expiresAt' => $expiresAt instanceof \DateTimeInterface ? $expiresAt->format('Y-m-d\TH:i:s') : $expiresAt,
        'now' => $now instanceof \DateTimeInterface ? $now->format('Y-m-d\TH:i:s') : $now, 'labels' => $l,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'device-code-display') }}" x-data="nqDeviceCodeDisplay(@js($config))" x-modelable="status" x-bind:data-status="shown()"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground mx-auto w-full max-w-lg gap-5 p-6 text-center sm:p-8') }}>
    @if ($mark && ! $mark->isEmpty())
        <div class="flex justify-center">{{ $mark }}</div>
    @endif
    <header class="flex flex-col gap-1.5">
        <h1 class="text-h2 text-foreground">{{ $l['title'] }}</h1>
        <p class="text-body-sm text-muted-foreground">{{ $l['description'] }}</p>
    </header>
    <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
        <div class="flex flex-col items-center gap-1" data-slot="device-code-qr" x-bind:class="is('pending') ? '' : 'opacity-50'">
            <div class="rounded-card border border-border bg-white p-1">
                <x-nq::qr-code :value="$verificationUriComplete ?? $verificationUri" :size="148" :margin="1" :label="$l['scan']" />
            </div>
        </div>
        <div class="flex min-w-0 flex-1 flex-col items-stretch gap-3 text-start">
            <div class="flex flex-col gap-1">
                <span class="text-caption text-muted-foreground">{{ $l['address'] }}</span>
                <x-nq::copy-button.field :value="$verificationUri" :label="$l['address']" />
            </div>
            <div class="flex flex-col gap-1">
                <span class="text-caption text-muted-foreground">{{ $l['yourCode'] }}</span>
                <div class="flex items-center justify-between gap-2 rounded-control border border-border bg-muted/50 py-2 ps-4 pe-2" x-bind:class="is('pending') ? '' : 'opacity-60'">
                    <span data-slot="device-code" dir="ltr" class="font-mono text-h2 tracking-[0.12em] text-foreground">{{ $grouped }}</span>
                    <x-nq::copy-button :value="$grouped" variant="secondary" />
                </div>
            </div>
        </div>
    </div>
    <div aria-live="polite" role="status" data-slot="device-code-status" class="flex flex-col items-center gap-2">
        <p class="inline-flex items-center gap-2 text-body-sm text-muted-foreground" x-show="is('pending')">
            <x-nq::spinner />
            {{ $l['waiting'] }}
            <span dir="ltr" class="tabular-nums" style="display: none" x-show="expiresLabel()" x-text="'· ' + expiresLabel()"></span>
        </p>
        <p class="inline-flex items-center gap-2 text-body-sm text-nq-success-text" style="display: none" x-show="is('approved')">
            <x-lucide-check aria-hidden="true" class="size-4" />
            {{ $l['approvedDevice'] }}
        </p>
        <p class="inline-flex items-center gap-2 text-body-sm text-nq-danger-text" style="display: none" x-show="is('denied')">
            <x-lucide-ban aria-hidden="true" class="size-4" />
            {{ $l['deniedDevice'] }}
        </p>
        <div class="flex flex-col items-center gap-2" style="display: none" x-show="is('expired')">
            <p class="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
                <x-lucide-timer-off aria-hidden="true" class="size-4" />
                {{ $l['expiredTitle'] }}
            </p>
            @if ($refresh)
                <x-nq::button variant="primary" x-on:click="$dispatch('nq-device-refresh')">{{ $l['refresh'] }}</x-nq::button>
            @endif
        </div>
    </div>
</div>

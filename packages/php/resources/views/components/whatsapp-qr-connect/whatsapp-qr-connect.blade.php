{{-- <x-nq::whatsapp-qr-connect status="qr" :qr="$session->qr" :expires-at="$session->expiresAt" start refresh disconnect />
     Link a WhatsApp number by scanning a QR code. Your server owns the pairing session: you feed the card the current qr and its expires-at.
     It shows the steps, a live countdown, asks for a new code when it expires, and switches to a connected card with a confirmed disconnect.
     The code is drawn plain black on white with square modules, because phone cameras need the contrast.
     status: disconnected | qr | connected. qr: the pairing payload. expires-at: when it stops being valid (ms since epoch). account: the linked number
     (shown LTR). connected-since: display text, already formatted. start / refresh / disconnect: show the buttons. error: pairing failed, shows a
     retry. auto-refresh (true): ask for a new code on expiry. labels: array overriding the built-in words.
     Needs the Alpine runtime (@nasaqScripts). The card dispatches bubbling "nq-whatsapp-start" | "nq-whatsapp-refresh" | "nq-whatsapp-disconnect" events
     with { wait(promise) }; the button stays busy until the promise settles. Feed it new data with
     $dispatch('nq-whatsapp-update', { status, qr, expiresAt, account, connectedSince, error }) on the card. --}}
@props(['status' => 'disconnected', 'qr' => null, 'expiresAt' => null, 'account' => null, 'connectedSince' => null, 'start' => false, 'refresh' => false, 'disconnect' => false, 'error' => false, 'autoRefresh' => true, 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $words = [
        'en' => [
            'title' => 'Connect WhatsApp', 'description' => 'Link a WhatsApp number by scanning a code from the phone.', 'stepsLabel' => 'How to link',
            'step1' => 'Open WhatsApp on your phone.', 'step2' => 'Go to Settings, then Linked devices.', 'step3' => 'Tap Link a device and point the camera at this code.',
            'start' => 'Show QR code', 'starting' => 'Preparing the code…', 'qrLabel' => 'WhatsApp link QR code',
            'expiresIn' => 'Code expires in {s}s', 'expired' => 'This code expired', 'refresh' => 'New code', 'refreshing' => 'Refreshing…',
            'autoRefresh' => 'A new code appears automatically when this one expires.', 'connected' => 'Connected', 'disconnected' => 'Not connected',
            'connectedAs' => 'Linked to ', 'since' => 'Since {when}', 'disconnect' => 'Disconnect', 'disconnectTitle' => 'Disconnect WhatsApp?',
            'disconnectBody' => 'Messages will stop until you scan a new code.', 'confirm' => 'Yes, disconnect', 'cancel' => 'Cancel',
            'failed' => 'Could not get a code. Check the connection and try again.', 'retry' => 'Try again', 'connectingStatus' => 'Waiting for the scan',
        ],
        'ar' => [
            'title' => 'ربط واتساب', 'description' => 'اربط رقم واتساب بمسح رمز من الهاتف.', 'stepsLabel' => 'طريقة الربط',
            'step1' => 'افتح واتساب على هاتفك.', 'step2' => 'اذهب إلى الإعدادات ثم الأجهزة المرتبطة.', 'step3' => 'اضغط «ربط جهاز» ووجّه الكاميرا إلى هذا الرمز.',
            'start' => 'إظهار رمز QR', 'starting' => 'جارٍ تجهيز الرمز…', 'qrLabel' => 'رمز QR لربط واتساب',
            'expiresIn' => 'ينتهي الرمز خلال {s} ثانية', 'expired' => 'انتهت صلاحية هذا الرمز', 'refresh' => 'رمز جديد', 'refreshing' => 'جارٍ التحديث…',
            'autoRefresh' => 'يظهر رمز جديد تلقائيًا عند انتهاء هذا الرمز.', 'connected' => 'متصل', 'disconnected' => 'غير متصل',
            'connectedAs' => 'مرتبط بالرقم ', 'since' => 'منذ {when}', 'disconnect' => 'قطع الاتصال', 'disconnectTitle' => 'قطع اتصال واتساب؟',
            'disconnectBody' => 'ستتوقف الرسائل إلى أن تمسح رمزًا جديدًا.', 'confirm' => 'نعم، اقطع الاتصال', 'cancel' => 'إلغاء',
            'failed' => 'تعذر الحصول على رمز. تحقق من الاتصال وحاول مرة أخرى.', 'retry' => 'حاول مرة أخرى', 'connectingStatus' => 'بانتظار المسح',
        ],
    ];
    $t = array_merge($words[$ar ? 'ar' : 'en'], $labels);
    $showQr = $status === 'qr' && filled($qr);
    $connected = $status === 'connected';
    $config = [
        'status' => $status, 'qr' => $qr ?? '', 'expiresAt' => $expiresAt, 'account' => $account ?? '', 'connectedSince' => $connectedSince ?? '',
        'error' => (bool) $error, 'autoRefresh' => (bool) $autoRefresh, 'expiresIn' => $t['expiresIn'], 'expired' => $t['expired'],
    ];
    $steps = [$t['step1'], $t['step2'], $t['step3']];
@endphp
<div data-slot="whatsapp-qr-connect" x-data="nqWhatsappConnect({{ Js::from($config) }})" x-bind:data-status="status" x-on:nq-whatsapp-update="update($event.detail)"
    {{ $attributes->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-2xl') }}>
    <x-nq::card.header>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::card.title as="h2">{{ $t['title'] }}</x-nq::card.title>
            <x-nq::status tone="success" x-show="status === 'connected'" :style="$connected ? null : 'display: none'">{{ $t['connected'] }}</x-nq::status>
            <x-nq::status tone="info" x-show="status === 'qr'" :style="$status === 'qr' ? null : 'display: none'">{{ $t['connectingStatus'] }}</x-nq::status>
            <x-nq::status tone="neutral" x-show="status === 'disconnected'" :style="$status === 'disconnected' ? null : 'display: none'">{{ $t['disconnected'] }}</x-nq::status>
        </div>
        <x-nq::card.description>{{ $t['description'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content>
        <div data-slot="whatsapp-connected" x-show="status === 'connected'" class="flex flex-wrap items-center justify-between gap-3" @unless ($connected) style="display: none" @endunless>
            <div class="flex min-w-0 flex-col gap-0.5">
                <p class="text-label text-foreground">{{ $t['connectedAs'] }}<bdi dir="ltr" class="tabular-nums" x-text="account">{{ $account }}</bdi></p>
                <p class="text-caption text-muted-foreground" x-show="connectedSince" x-text="{{ Js::from($t['since']) }}.replace('{when}', connectedSince)" @unless ($connectedSince) style="display: none" @endunless>{{ $connectedSince ? str_replace('{when}', $connectedSince, $t['since']) : '' }}</p>
            </div>
            @if ($disconnect)
                <x-nq::alert-dialog.confirm-button variant="danger" size="sm" :title="$t['disconnectTitle']" :description="$t['disconnectBody']" :confirm-label="$t['confirm']" :cancel-label="$t['cancel']" x-on:click="run('disconnect')">{{ $t['disconnect'] }}</x-nq::alert-dialog.confirm-button>
            @endif
        </div>
        <div x-show="status !== 'connected'" class="flex flex-col gap-5 sm:flex-row sm:items-start" @if ($connected) style="display: none" @endif>
            <div class="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start" data-slot="whatsapp-qr">
                <div x-show="showQr" x-bind:class="{ 'opacity-40': expired || busy === 'refresh' }" class="relative rounded-card border border-border bg-white p-2 transition-opacity" @unless ($showQr) style="display: none" @endunless>
                    <x-nq::qr-code :value="$qr ?? ''" x-model="qr" :size="192" :margin="1" :label="$t['qrLabel']" />
                </div>
                <div x-show="!showQr" class="flex size-[208px] items-center justify-center rounded-card border border-dashed border-border bg-secondary p-4 text-center" @if ($showQr) style="display: none" @endif>
                    <span class="text-body-sm text-muted-foreground" role="status" x-show="busy === 'start'" style="display: none">{{ $t['starting'] }}</span>
                    <x-nq::button type="button" variant="primary" size="sm" x-show="busy !== 'start'" :disabled="! $start" x-on:click="run('start')">{{ $t['start'] }}</x-nq::button>
                </div>
                <div x-show="showQr" class="flex flex-col items-center gap-1.5" @unless ($showQr) style="display: none" @endunless>
                    <p class="text-caption tabular-nums text-muted-foreground" role="timer" aria-live="off" data-slot="whatsapp-countdown" x-show="left !== null" x-text="countdownText" style="display: none"></p>
                    <x-nq::button type="button" variant="ghost" size="sm" :disabled="! $refresh" x-on:click="run('refresh')" x-bind:aria-busy="busy === 'refresh' ? 'true' : null" x-bind:data-disabled="busy === 'refresh' ? '' : null">
                        <x-nq::spinner x-show="busy === 'refresh'" style="display: none" />
                        <x-lucide-refresh-cw aria-hidden="true" x-show="busy !== 'refresh'" />
                        <span x-text="busy === 'refresh' ? {{ Js::from($t['refreshing']) }} : {{ Js::from($t['refresh']) }}">{{ $t['refresh'] }}</span>
                    </x-nq::button>
                </div>
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-3">
                <ol aria-label="{{ $t['stepsLabel'] }}" class="flex flex-col gap-2.5">
                    @foreach ($steps as $i => $s)
                        <li class="flex items-start gap-2.5 text-body-sm text-foreground">
                            <span aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-caption tabular-nums text-muted-foreground">{{ $i + 1 }}</span>
                            <span class="pt-0.5">{{ $s }}</span>
                        </li>
                    @endforeach
                </ol>
                <p class="text-caption text-muted-foreground" x-show="showQr && autoRefresh" @unless ($showQr && $autoRefresh) style="display: none" @endunless>{{ $t['autoRefresh'] }}</p>
                <x-nq::alert tone="danger" x-show="error" :style="$error ? null : 'display: none'">
                    {{ $t['failed'] }}
                        <x-slot:action>
                            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="run(showQr ? 'refresh' : 'start')" :style="($start || $refresh) ? null : 'display: none'">{{ $t['retry'] }}</x-nq::button>
                        </x-slot:action>
                </x-nq::alert>
            </div>
        </div>
    </x-nq::card.content>
</div>

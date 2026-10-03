{{-- <x-nq::notification-preferences :kinds="[['id' => 'mention', 'label' => 'Mentions', 'group' => 'Activity'], ['id' => 'security', 'label' => 'Security alerts', 'group' => 'Account', 'locked' => ['email']]]"
         :value="['matrix' => ['mention' => ['email' => true]], 'dailyCap' => 20]" @save="$event.detail.wait(savePrefs($event.detail.prefs))" />
     The notification settings screen: a matrix of kinds by channel (email, push, WhatsApp, desktop), quiet hours, a daily cap with batching, a digest schedule
     and extra email or webhook destinations with a test send. There is no Save button: each change is applied on screen at once and sent to you, and if your
     save fails the screen goes back to the last saved state. Saves run one after another. Needs the Alpine runtime (@nasaqScripts).
     kinds: [['id', 'label', 'description', 'group', 'locked' => ['email', ...]], ...] (locked channels are fixed on). channels: columns to show (default email, push, whatsapp, desktop).
     unavailable: ['whatsapp' => 'Add a WhatsApp number first'] locks a column and says why. value: ['matrix' => ['kindId' => ['email' => true]], 'quietHours' => ['enabled', 'from', 'to'],
     'dailyCap' => int|null, 'batching' => 'instant'|'hourly'|'daily', 'digest' => ['enabled', 'frequency' => 'daily'|'weekly', 'time', 'day']].
     push-permission: default | granted | denied | unsupported; with request-push (true) turning push on asks the browser first (fires request-push).
     destinations: [['id', 'kind' => 'email'|'webhook', 'target', 'label', 'verified']] (omit to hide the section); can-add, can-remove, can-test show the controls.
     sections: any of matrix, quiet, limits, digest, destinations. now: a local time "2026-09-29T09:00:00" for the "Next digest" line. labels: any string below, by key.
     It fires events on the root with detail { ..., wait(promise) }:
       save                 detail.prefs { matrix, quietHours, dailyCap, batching, digest }; resolve, or resolve { error } to roll back. Nobody listening rolls back too.
       request-push         resolve 'granted' | 'denied' | 'default' | 'unsupported'
       add-destination      detail { kind, target }; resolve, or { error }
       remove-destination   detail { id, target }; resolve, or { error }. The row is hidden once it resolves; re-render the list as well.
       test-destination     detail { id, target, kind }; resolve { ok, message? } --}}
@props(['kinds' => [], 'channels' => ['email', 'push', 'whatsapp', 'desktop'], 'unavailable' => [], 'value' => [], 'pushPermission' => null, 'requestPush' => false, 'destinations' => null, 'canAdd' => false, 'canRemove' => false, 'canTest' => false, 'sections' => ['matrix', 'quiet', 'limits', 'digest', 'destinations'], 'now' => null, 'labels' => []])
@php
    $S = [
        'en' => [
            'matrixTitle' => 'What to notify me about',
            'matrixBody' => 'Choose where each kind of notification reaches you.',
            'matrixLabel' => 'Notifications by kind and channel',
            'kind' => 'Notification',
            'channels' => ['email' => 'Email', 'push' => 'Push', 'whatsapp' => 'WhatsApp', 'desktop' => 'Desktop'],
            'cell' => '{x}: {y}',
            'all' => 'Turn {x} on or off for every kind',
            'locked' => 'Always on, it cannot be turned off',
            'unavailable' => 'Not available',
            'pushAsking' => 'Waiting for your browser to answer',
            'pushBlocked' => 'Browser notifications are blocked. Allow them in your browser\'s site settings, then try again.',
            'pushDenied' => 'Push was not turned on because the browser permission was not granted.',
            'pushUnsupported' => 'This browser does not support push notifications.',
            'pushNeeded' => 'The browser will ask for permission the first time you turn push on.',
            'saving' => 'Saving',
            'saved' => 'Saved',
            'failed' => 'That did not save, so it was put back. Try again.',
            'dismiss' => 'Dismiss',
            'quietTitle' => 'Quiet hours',
            'quietBody' => 'Hold notifications while you are away. They arrive when the quiet hours end.',
            'quietSwitch' => 'Turn on quiet hours',
            'from' => 'From',
            'to' => 'Until',
            'quietLength' => '{x} quiet each day',
            'quietOvernight' => 'Ends the next day',
            'quietNone' => 'Start and end are the same, so nothing is held.',
            'quietUrgent' => 'Security notices always come through.',
            'limitsTitle' => 'Volume',
            'limitsBody' => 'Keep the number of notifications under control.',
            'capSwitch' => 'Limit notifications per day',
            'capLabel' => 'Most per day',
            'capHelp' => 'Beyond this, the rest wait for your digest.',
            'capError' => 'Enter a whole number from 1 to 1,000.',
            'batching' => 'Delivery',
            'batchingOptions' => ['instant' => 'Send each one at once', 'hourly' => 'Group them every hour', 'daily' => 'Group them once a day'],
            'digestTitle' => 'Digest',
            'digestBody' => 'One summary of what you missed.',
            'digestSwitch' => 'Send me a digest',
            'frequency' => 'How often',
            'daily' => 'Every day',
            'weekly' => 'Every week',
            'day' => 'Day',
            'at' => 'Time',
            'weekdays' => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            'nextDigest' => 'Next digest',
            'destTitle' => 'Delivery destinations',
            'destBody' => 'Send notifications to an extra email address or a webhook.',
            'destEmpty' => 'No extra destinations yet.',
            'destKind' => 'Type',
            'destTarget' => 'Address',
            'destEmail' => 'Email',
            'destWebhook' => 'Webhook',
            'destEmailPlaceholder' => 'team@example.com',
            'destWebhookPlaceholder' => 'https://hooks.example.com/nasaq',
            'add' => 'Add destination',
            'remove' => 'Remove',
            'removeTitle' => 'Remove {x}?',
            'removeBody' => 'Notifications stop going there right away.',
            'verified' => 'Verified',
            'pending' => 'Waiting for confirmation',
            'test' => 'Send a test',
            'testing' => 'Sending',
            'testOk' => 'The test was delivered.',
            'testFailed' => 'The test failed.',
            'problem' => ['empty' => 'Enter an address.', 'email' => 'Enter a valid email address.', 'url' => 'Enter a valid URL.', 'https' => 'Webhooks must use https.'],
            'destFailed' => 'That destination could not be changed. Try again.',
        ],
        'ar' => [
            'matrixTitle' => 'بماذا نُنبّهك',
            'matrixBody' => 'اختر أين يصلك كل نوع من الإشعارات.',
            'matrixLabel' => 'الإشعارات حسب النوع والقناة',
            'kind' => 'الإشعار',
            'channels' => ['email' => 'البريد', 'push' => 'الدفع', 'whatsapp' => 'واتساب', 'desktop' => 'سطح المكتب'],
            'cell' => '{x}: {y}',
            'all' => 'تشغيل أو إيقاف {x} لكل الأنواع',
            'locked' => 'مفعّل دائمًا ولا يمكن إيقافه',
            'unavailable' => 'غير متاح',
            'pushAsking' => 'بانتظار ردّ المتصفح',
            'pushBlocked' => 'إشعارات المتصفح محظورة. اسمح بها من إعدادات الموقع في متصفحك ثم حاول مرة أخرى.',
            'pushDenied' => 'لم يُفعَّل الدفع لأن إذن المتصفح لم يُمنح.',
            'pushUnsupported' => 'هذا المتصفح لا يدعم إشعارات الدفع.',
            'pushNeeded' => 'سيطلب المتصفح الإذن أول مرة تفعّل فيها الدفع.',
            'saving' => 'جارٍ الحفظ',
            'saved' => 'تم الحفظ',
            'failed' => 'لم يُحفظ ذلك فأُعيد كما كان. حاول مرة أخرى.',
            'dismiss' => 'إغلاق',
            'quietTitle' => 'ساعات الهدوء',
            'quietBody' => 'احتفظ بالإشعارات أثناء غيابك. تصلك عند انتهاء ساعات الهدوء.',
            'quietSwitch' => 'تشغيل ساعات الهدوء',
            'from' => 'من',
            'to' => 'حتى',
            'quietLength' => '{x} هدوء كل يوم',
            'quietOvernight' => 'تنتهي في اليوم التالي',
            'quietNone' => 'البداية والنهاية متساويتان فلا يُحتجز شيء.',
            'quietUrgent' => 'إشعارات الأمان تصل دائمًا.',
            'limitsTitle' => 'الكمية',
            'limitsBody' => 'تحكّم في عدد الإشعارات.',
            'capSwitch' => 'تحديد عدد الإشعارات يوميًا',
            'capLabel' => 'الحد الأقصى يوميًا',
            'capHelp' => 'ما زاد عن ذلك ينتظر ملخّصك.',
            'capError' => 'أدخل عددًا صحيحًا من 1 إلى 1000.',
            'batching' => 'طريقة التسليم',
            'batchingOptions' => ['instant' => 'أرسل كل إشعار فورًا', 'hourly' => 'اجمعها كل ساعة', 'daily' => 'اجمعها مرة في اليوم'],
            'digestTitle' => 'الملخّص',
            'digestBody' => 'ملخص واحد لما فاتك.',
            'digestSwitch' => 'أرسل لي ملخصًا',
            'frequency' => 'التكرار',
            'daily' => 'كل يوم',
            'weekly' => 'كل أسبوع',
            'day' => 'اليوم',
            'at' => 'الوقت',
            'weekdays' => ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
            'nextDigest' => 'الملخّص القادم',
            'destTitle' => 'وجهات التسليم',
            'destBody' => 'أرسل الإشعارات إلى بريد إضافي أو إلى webhook.',
            'destEmpty' => 'لا توجد وجهات إضافية بعد.',
            'destKind' => 'النوع',
            'destTarget' => 'العنوان',
            'destEmail' => 'بريد إلكتروني',
            'destWebhook' => 'Webhook',
            'destEmailPlaceholder' => 'team@example.com',
            'destWebhookPlaceholder' => 'https://hooks.example.com/nasaq',
            'add' => 'إضافة وجهة',
            'remove' => 'إزالة',
            'removeTitle' => 'إزالة {x}؟',
            'removeBody' => 'تتوقف الإشعارات عن الذهاب إليها فورًا.',
            'verified' => 'موثّق',
            'pending' => 'بانتظار التأكيد',
            'test' => 'إرسال اختبار',
            'testing' => 'جارٍ الإرسال',
            'testOk' => 'وصل الاختبار.',
            'testFailed' => 'فشل الاختبار.',
            'problem' => ['empty' => 'أدخل عنوانًا.', 'email' => 'أدخل بريدًا إلكترونيًا صحيحًا.', 'url' => 'أدخل رابطًا صحيحًا.', 'https' => 'يجب أن يستخدم الـ webhook بروتوكول https.'],
            'destFailed' => 'تعذّر تغيير هذه الوجهة. حاول مرة أخرى.',
        ],
    ];
    $L = fn (string $key) => $labels[$key] ?? $S[\Nasaq\Nasaq::rtl() ? 'ar' : 'en'][$key];
    $strings = [];
    foreach (array_keys($S['en']) as $k) { $strings[$k] = $L($k); }
    $ar = \Nasaq\Nasaq::rtl();
    $chName = fn ($c) => $labels['channels'][$c] ?? ($S[$ar ? 'ar' : 'en']['channels'][$c] ?? $c);
    $strings['channels'] = array_combine($channels, array_map($chName, $channels));
    $P = array_replace_recursive([
        'matrix' => [], 'quietHours' => ['enabled' => false, 'from' => '22:00', 'to' => '07:00'], 'dailyCap' => null, 'batching' => 'instant',
        'digest' => ['enabled' => false, 'frequency' => 'daily', 'time' => '08:00', 'day' => 1],
    ], $value);
    $has = fn ($s) => in_array($s, $sections, true);
    $blocked = in_array($pushPermission, ['denied', 'unsupported'], true);
    $needsAsk = $pushPermission !== null && $pushPermission !== 'granted' && ! $blocked && $requestPush;
    $reasonFor = function ($c) use ($unavailable, $pushPermission, $strings) {
        if (! empty($unavailable[$c])) { return $unavailable[$c]; }
        if ($c === 'push' && $pushPermission === 'denied') { return $strings['pushBlocked']; }
        if ($c === 'push' && $pushPermission === 'unsupported') { return $strings['pushUnsupported']; }
        return null;
    };
    $isLocked = fn ($k, $c) => in_array($c, $k['locked'] ?? [], true);
    $isOn = fn ($k, $c) => $isLocked($k, $c) || ! empty($P['matrix'][$k['id']][$c]);
    $colState = function ($c) use ($kinds, $P, $isLocked) {
        $free = array_values(array_filter($kinds, fn ($k) => ! $isLocked($k, $c)));
        $on = count(array_filter($free, fn ($k) => ! empty($P['matrix'][$k['id']][$c])));
        return count($free) === 0 || $on === 0 ? 'none' : ($on === count($free) ? 'all' : 'some');
    };
    $nowDt = $now ? new \DateTimeImmutable($now) : new \DateTimeImmutable('now');
    $hm = fn ($s) => array_map('intval', explode(':', (string) $s)) + [0, 0];
    $nextDigest = null;
    if ($P['digest']['enabled']) {
        [$h, $m] = $hm($P['digest']['time']);
        $at = $nowDt->setTime($h, $m, 0);
        if ($P['digest']['frequency'] === 'weekly') {
            $add = ($P['digest']['day'] - (int) $at->format('w') + 7) % 7;
            if ($add === 0 && $at <= $nowDt) { $add = 7; }
            $at = $at->modify('+'.$add.' days');
        } elseif ($at <= $nowDt) {
            $at = $at->modify('+1 day');
        }
        $nextDigest = $at;
    }
    $nextText = '';
    if ($nextDigest) {
        $nextText = class_exists(\IntlDateFormatter::class)
            ? (new \IntlDateFormatter($ar ? 'ar' : 'en', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, $nextDigest->getTimezone()->getName(), null, $ar ? 'EEEE d MMM، h:mm a' : 'EEEE, MMM d, h:mm a'))->format($nextDigest)
            : $nextDigest->format('l, M j, g:i A');
    }
    $minutes = (function ($q) use ($hm) {
        $d = $hm($q['to'])[0] * 60 + $hm($q['to'])[1] - ($hm($q['from'])[0] * 60 + $hm($q['from'])[1]);
        return $d === 0 ? 0 : ($d > 0 ? $d : $d + 1440);
    })($P['quietHours']);
    $quietSummary = $minutes === 0 ? $strings['quietNone']
        : str_replace('{x}', rtrim(rtrim(number_format(round($minutes / 6) / 10, 1, '.', ''), '0'), '.'), $strings['quietLength']).($P['quietHours']['from'] > $P['quietHours']['to'] ? '. '.$strings['quietOvernight'] : '').'. '.$strings['quietUrgent'];
    $config = [
        'locale' => $ar ? 'ar' : 'en',
        'now' => $now ? $nowDt->format('Y-m-d\TH:i:s') : null,
        'kinds' => array_map(fn ($k) => ['id' => $k['id'], 'locked' => $k['locked'] ?? []], array_values($kinds)),
        'channels' => array_values($channels),
        'value' => $P,
        'needsAsk' => $needsAsk,
        'labels' => $strings,
        'destinations' => $destinations === null ? [] : array_map(fn ($d) => ['id' => $d['id'], 'kind' => $d['kind'], 'target' => $d['target']], array_values($destinations)),
    ];
    $table = 'w-full min-w-[30rem] border-collapse text-body-sm';
    $batches = ['instant', 'hourly', 'daily'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'notification-preferences') }}" x-data="nqNotificationPreferences(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-6') }}>
    <div role="status" aria-live="polite" class="-mb-3 h-4 text-end text-caption text-muted-foreground" x-text="status"></div>
    <template x-if="notice !== null">
        <x-nq::alert x-bind:tone="notice.tone" dismissible :dismiss-label="$strings['dismiss']" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>

    @if ($has('matrix'))
        <x-nq::account-settings.settings-section :title="$strings['matrixTitle']" :description="$strings['matrixBody']">
            <div class="overflow-x-auto">
                <table data-slot="notification-matrix" aria-label="{{ $strings['matrixLabel'] }}" class="{{ $table }}">
                    <thead>
                        <tr class="border-b border-border">
                            <th scope="col" class="py-2 pe-3 text-start text-caption font-medium text-muted-foreground">{{ $strings['kind'] }}</th>
                            @foreach ($channels as $c)
                                @php($reason = $reasonFor($c))
                                @php($cs = $colState($c))
                                <th scope="col" class="w-24 px-2 py-2 text-center align-bottom font-medium">
                                    <span class="flex flex-col items-center gap-1.5">
                                        <span class="text-label text-foreground">{{ $strings['channels'][$c] }}</span>
                                        @if ($reason)
                                            <x-nq::checkbox :checked="$cs === 'all'" :indeterminate="$cs === 'some'" disabled x-model="colOn.{{ $c }}" x-effect="indeterminate = colSome.{{ $c }}" aria-label="{{ str_replace('{x}', $strings['channels'][$c], $strings['all']) }}" />
                                            <span class="text-caption font-normal text-muted-foreground">{{ $reason }}</span>
                                        @else
                                            <x-nq::checkbox :checked="$cs === 'all'" :indeterminate="$cs === 'some'" x-model="colOn.{{ $c }}" x-effect="indeterminate = colSome.{{ $c }}" x-bind:disabled="asking" x-bind:data-disabled="asking ? '' : undefined" aria-label="{{ str_replace('{x}', $strings['channels'][$c], $strings['all']) }}" />
                                        @endif
                                    </span>
                                </th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($kinds as $i => $k)
                            @if (! empty($k['group']) && $k['group'] !== ($kinds[$i - 1]['group'] ?? null))
                                <tr>
                                    <th scope="colgroup" colspan="{{ count($channels) + 1 }}" class="pb-1 pt-4 text-start text-caption font-medium uppercase tracking-wide text-muted-foreground">{{ $k['group'] }}</th>
                                </tr>
                            @endif
                            <tr class="border-b border-border last:border-b-0">
                                <th scope="row" class="py-3 pe-3 text-start font-normal">
                                    <span class="block text-label text-foreground">{{ $k['label'] }}</span>
                                    @if (! empty($k['description']))<span class="block text-caption text-muted-foreground">{{ $k['description'] }}</span>@endif
                                </th>
                                @foreach ($channels as $c)
                                    @php($locked = $isLocked($k, $c))
                                    @php($reason = $reasonFor($c))
                                    <td class="px-2 py-3 text-center">
                                        <span class="inline-flex items-center justify-center" @if ($locked) title="{{ $strings['locked'] }}" @elseif ($reason) title="{{ $reason }}" @endif>
                                            @if ($locked || $reason)
                                                <x-nq::checkbox :checked="$isOn($k, $c)" disabled x-model="cells['{{ $i }}|{{ $c }}']" aria-label="{{ str_replace(['{x}', '{y}'], [$k['label'], $strings['channels'][$c]], $strings['cell']) }}" />
                                            @else
                                                <x-nq::checkbox :checked="$isOn($k, $c)" x-model="cells['{{ $i }}|{{ $c }}']" x-bind:disabled="asking" x-bind:data-disabled="asking ? '' : undefined" aria-label="{{ str_replace(['{x}', '{y}'], [$k['label'], $strings['channels'][$c]], $strings['cell']) }}" />
                                            @endif
                                            @if ($locked)<x-lucide-lock aria-hidden="true" class="ms-1 size-3 text-muted-foreground" />@endif
                                        </span>
                                    </td>
                                @endforeach
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if ($needsAsk && in_array('push', $channels, true))
                <p class="mt-3 text-caption text-muted-foreground">{{ $strings['pushNeeded'] }}</p>
            @endif
        </x-nq::account-settings.settings-section>
    @endif

    @if ($has('quiet'))
        <x-nq::account-settings.settings-section :title="$strings['quietTitle']" :description="$strings['quietBody']">
            <div class="flex flex-col gap-4">
                <label class="flex items-center justify-between gap-4">
                    <span class="flex items-center gap-2 text-label text-foreground">
                        <x-lucide-moon-star aria-hidden="true" class="size-4 text-muted-foreground" />
                        {{ $strings['quietSwitch'] }}
                    </span>
                    <x-nq::switch :checked="$P['quietHours']['enabled']" x-model="quietOn" />
                </label>
                <div class="flex flex-col gap-4" x-show="quietOn" @unless ($P['quietHours']['enabled']) style="display: none" @endunless>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field>
                            <x-nq::field.label>{{ $strings['from'] }}</x-nq::field.label>
                            <x-nq::date-picker.time :value="$P['quietHours']['from']" x-model="quietFrom" aria-label="{{ $strings['from'] }}" />
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $strings['to'] }}</x-nq::field.label>
                            <x-nq::date-picker.time :value="$P['quietHours']['to']" x-model="quietTo" aria-label="{{ $strings['to'] }}" />
                        </x-nq::field>
                    </div>
                    <p class="text-body-sm text-muted-foreground" data-slot="quiet-summary" x-text="quietSummary">{{ $quietSummary }}</p>
                </div>
            </div>
        </x-nq::account-settings.settings-section>
    @endif

    @if ($has('limits'))
        <x-nq::account-settings.settings-section :title="$strings['limitsTitle']" :description="$strings['limitsBody']">
            <div class="flex flex-col gap-4">
                <label class="flex items-center justify-between gap-4">
                    <span class="text-label text-foreground">{{ $strings['capSwitch'] }}</span>
                    <x-nq::switch :checked="$P['dailyCap'] !== null" x-model="capOn" />
                </label>
                <div x-show="capOn" @if ($P['dailyCap'] === null) style="display: none" @endif>
                    <x-nq::field x-model="capInvalid">
                        <x-nq::field.label>{{ $strings['capLabel'] }}</x-nq::field.label>
                        <x-nq::field.input ltr inputmode="numeric" class="w-32" value="{{ $P['dailyCap'] }}" x-model="capText" x-on:blur="saveCap()" x-on:keydown.enter.prevent="saveCap()" />
                        <x-nq::field.error><span>{{ $strings['capError'] }}</span></x-nq::field.error>
                        <x-nq::field.description x-show="! capInvalid">{{ $strings['capHelp'] }}</x-nq::field.description>
                    </x-nq::field>
                </div>
                <x-nq::field>
                    <x-nq::field.label>{{ $strings['batching'] }}</x-nq::field.label>
                    <x-nq::select :value="$P['batching']" x-model="batching">
                        <x-nq::select.trigger aria-label="{{ $strings['batching'] }}" class="w-full sm:w-72"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($batches as $b)
                                <x-nq::select.item :value="$b">{{ $strings['batchingOptions'][$b] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
            </div>
        </x-nq::account-settings.settings-section>
    @endif

    @if ($has('digest'))
        <x-nq::account-settings.settings-section :title="$strings['digestTitle']" :description="$strings['digestBody']">
            <div class="flex flex-col gap-4">
                <label class="flex items-center justify-between gap-4">
                    <span class="flex items-center gap-2 text-label text-foreground">
                        <x-lucide-calendar-clock aria-hidden="true" class="size-4 text-muted-foreground" />
                        {{ $strings['digestSwitch'] }}
                    </span>
                    <x-nq::switch :checked="$P['digest']['enabled']" x-model="digestOn" />
                </label>
                <div class="flex flex-col gap-4" x-show="digestOn" @unless ($P['digest']['enabled']) style="display: none" @endunless>
                    <div class="grid gap-4 sm:grid-cols-3">
                        <x-nq::field>
                            <x-nq::field.label>{{ $strings['frequency'] }}</x-nq::field.label>
                            <x-nq::select :value="$P['digest']['frequency']" x-model="frequency">
                                <x-nq::select.trigger aria-label="{{ $strings['frequency'] }}"><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="daily">{{ $strings['daily'] }}</x-nq::select.item>
                                    <x-nq::select.item value="weekly">{{ $strings['weekly'] }}</x-nq::select.item>
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                        <div x-show="frequency === 'weekly'" @if ($P['digest']['frequency'] !== 'weekly') style="display: none" @endif>
                            <x-nq::field>
                                <x-nq::field.label>{{ $strings['day'] }}</x-nq::field.label>
                                <x-nq::select :value="(string) $P['digest']['day']" x-model="day">
                                    <x-nq::select.trigger aria-label="{{ $strings['day'] }}"><x-nq::select.value /></x-nq::select.trigger>
                                    <x-nq::select.content>
                                        @foreach ($strings['weekdays'] as $wi => $w)
                                            <x-nq::select.item :value="(string) $wi">{{ $w }}</x-nq::select.item>
                                        @endforeach
                                    </x-nq::select.content>
                                </x-nq::select>
                            </x-nq::field>
                        </div>
                        <x-nq::field>
                            <x-nq::field.label>{{ $strings['at'] }}</x-nq::field.label>
                            <x-nq::date-picker.time :value="$P['digest']['time']" x-model="digestTime" aria-label="{{ $strings['at'] }}" />
                        </x-nq::field>
                    </div>
                    <p class="text-body-sm text-muted-foreground" x-show="nextIso !== ''" @unless ($nextDigest) style="display: none" @endunless>
                        {{ $strings['nextDigest'] }}:
                        <time x-bind:datetime="nextIso" class="text-foreground" x-text="nextText" @if ($nextDigest) datetime="{{ $nextDigest->format('c') }}" @endif>{{ $nextText }}</time>
                    </p>
                </div>
            </div>
        </x-nq::account-settings.settings-section>
    @endif

    @if ($has('destinations') && $destinations !== null)
        <x-nq::account-settings.settings-section :title="$strings['destTitle']" :description="$strings['destBody']">
            <div class="flex flex-col gap-4" data-slot="notification-destinations">
                <template x-if="destError !== null">
                    <x-nq::alert tone="danger" dismissible :dismiss-label="$strings['dismiss']" x-on:nq:dismiss="destError = null"><span x-text="destError"></span></x-nq::alert>
                </template>
                @if (count($destinations))
                    <ul class="flex flex-col divide-y divide-border rounded-card border border-border" x-show="visibleCount > 0">
                        @foreach ($destinations as $d)
                            <li class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5" x-show="! removed['{{ $d['id'] }}']" data-destination="{{ $d['id'] }}">
                                @if ($d['kind'] === 'email')<x-lucide-mail aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />@else<x-lucide-webhook aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />@endif
                                <div class="flex min-w-0 flex-1 flex-col">
                                    <bdi dir="ltr" class="truncate text-body-sm text-foreground">{{ $d['target'] }}</bdi>
                                    <span class="text-caption text-muted-foreground">{{ $d['label'] ?? ($d['kind'] === 'email' ? $strings['destEmail'] : $strings['destWebhook']) }}</span>
                                </div>
                                @if ($d['kind'] === 'email')
                                    <x-nq::badge :variant="! empty($d['verified']) ? 'success' : 'warning'">{{ ! empty($d['verified']) ? $strings['verified'] : $strings['pending'] }}</x-nq::badge>
                                @endif
                                @if ($canTest)
                                    <x-nq::button size="sm" variant="secondary" x-on:click="test('{{ $d['id'] }}')" x-bind:disabled="testing !== null">
                                        <x-lucide-send class="rtl:-scale-x-100" />
                                        <span x-text="testing === '{{ $d['id'] }}' ? labels.testing : labels.test">{{ $strings['test'] }}</span>
                                    </x-nq::button>
                                @endif
                                @if ($canRemove)
                                    <x-nq::alert-dialog.confirm-button size="sm" variant="ghost" :title="str_replace('{x}', $d['target'], $strings['removeTitle'])" :description="$strings['removeBody']" :confirm-label="$strings['remove']" x-on:click="remove('{{ $d['id'] }}')">
                                        <x-lucide-trash-2 />
                                        {{ $strings['remove'] }}
                                    </x-nq::alert-dialog.confirm-button>
                                @endif
                                <p role="status" class="basis-full text-caption" style="display: none" x-show="results['{{ $d['id'] }}']" x-text="results['{{ $d['id'] }}'] ? results['{{ $d['id'] }}'].text : ''"
                                    x-bind:class="results['{{ $d['id'] }}'] && results['{{ $d['id'] }}'].ok ? 'text-nq-success-text' : 'text-nq-danger-text'"></p>
                            </li>
                        @endforeach
                    </ul>
                    <p class="text-body-sm text-muted-foreground" x-show="visibleCount === 0" style="display: none">{{ $strings['destEmpty'] }}</p>
                @else
                    <p class="text-body-sm text-muted-foreground">{{ $strings['destEmpty'] }}</p>
                @endif
                @if ($canAdd)
                    <form novalidate class="flex flex-col gap-3 sm:flex-row sm:items-start" x-on:submit.prevent="addDestination()">
                        <x-nq::field class="sm:w-40">
                            <x-nq::field.label>{{ $strings['destKind'] }}</x-nq::field.label>
                            <x-nq::select value="email" x-model="newKind">
                                <x-nq::select.trigger aria-label="{{ $strings['destKind'] }}"><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="email">{{ $strings['destEmail'] }}</x-nq::select.item>
                                    <x-nq::select.item value="webhook">{{ $strings['destWebhook'] }}</x-nq::select.item>
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                        <x-nq::field class="flex-1" x-model="targetBad">
                            <x-nq::field.label>{{ $strings['destTarget'] }}</x-nq::field.label>
                            <x-nq::field.input ltr autocapitalize="none" spellcheck="false" x-model="newTarget" x-bind:placeholder="newKind === 'email' ? labels.destEmailPlaceholder : labels.destWebhookPlaceholder" placeholder="{{ $strings['destEmailPlaceholder'] }}" x-bind:disabled="adding" />
                            <x-nq::field.error><span x-text="targetError"></span></x-nq::field.error>
                        </x-nq::field>
                        <x-nq::button type="submit" variant="secondary" class="sm:mt-6" x-bind:disabled="adding">
                            <x-lucide-plus />
                            {{ $strings['add'] }}
                        </x-nq::button>
                    </form>
                @endif
            </div>
        </x-nq::account-settings.settings-section>
    @endif
</div>

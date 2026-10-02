{{-- <x-nq::webhooks-manager :events="$events" :endpoints="$endpoints" :deliveries="$deliveries" :sources="$sources" @save-endpoint="$event.detail.wait(…)" @delete-endpoint="…" />
     Webhooks in one place, in three tabs: endpoints (URL, channel as text, events, enabled switch, masked signing secret) with an add and edit dialog, a test, secret rotation and a delete that asks first;
     the delivery log with an endpoint filter, a status filter, a detail dialog and replay; and inbound sources with an editable poll interval, last status and Poll now. A push endpoint card shows its token once.
     A new or rotated secret is shown once, with a snippet for verifying the signature.
     events: [['id' => 'order.created', 'label' => 'Order created', 'group' => 'Orders']].
     endpoints: [['id', 'name', 'url', 'channel' => 'Slack' (text), 'events' => ['order.created'], 'enabled' => true, 'secretLast4' => 'a1b2', 'lastDeliveryAt' => ISO string | epoch ms | DateTime, 'lastDeliveryStatus' => success | failed | pending]].
     deliveries: [['id', 'endpointId', 'event', 'status' => success | failed | pending, 'code' => 200, 'durationMs', 'at' => ISO string | epoch ms | DateTime, 'attempt' => 1, 'request' => '{…}', 'response', 'error']].
     sources: [['id', 'name', 'target' => 'https://…', 'intervalSeconds' => 300, 'lastStatus' => ok | error, 'lastAt', 'lastError']].
     push: ['url' => '…', 'token' => '…'] shows the push endpoint card (leave out to hide it).
     toggle / rotate / test / replay / interval / poll: set one to false to hide that feature (all on by default).
     It is presentational: it fires events on the root with detail { …, wait(promise) }; your handler talks to the server. Resolve, or resolve { error } shown in an alert.
       save-endpoint     { id?, name, url, channel, events }   resolve { error?, secret?, id? }; a secret is shown once
       delete-endpoint   { id }
       toggle-endpoint   { id, enabled }                       also the switch in the table; an error rolls the switch back
       rotate-secret     { id }                                resolve { secret } to show the new one once
       test-endpoint     { id }                                resolve { ok, code?, durationMs?, error? }
       replay-delivery   { id }
       set-interval      { id, seconds }                       also the select in the table; an error rolls it back
       poll-source       { id }                                resolve { lastStatus?: 'ok' | 'error', lastError? }
       dismiss-push      {}
     After a success the lists are updated in the page. A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the table cells are text (the last-delivery and last-polled columns are dates without a time, the response code is plain text),
     the poll interval is edited in its cell (double-click or Enter), the endpoint and event filters of the delivery log list the endpoints given here only,
     a group of events has an All button with a count instead of an indeterminate checkbox, the row menus always list their actions and ignore them while that row is busy,
     the test result and the replay and poll notices appear in an alert above the tabs, and the delivery detail shows plain text bodies.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['events' => [], 'endpoints' => [], 'deliveries' => [], 'sources' => [], 'push' => null, 'toggle' => true, 'rotate' => true, 'test' => true, 'replay' => true, 'interval' => true, 'poll' => true])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = $t::rtl();
    $when = fn ($v) => $v instanceof \DateTimeInterface ? $v->format(DATE_ATOM) : $v;
    $events = collect($events)->map(fn ($e) => ['id' => (string) $e['id'], 'label' => (string) $e['label'], 'group' => $e['group'] ?? null])->values()->all();
    $endpoints = collect($endpoints)->map(fn ($e) => array_filter([
        'id' => (string) $e['id'], 'name' => $e['name'], 'url' => $e['url'], 'channel' => $e['channel'] ?? null, 'events' => array_values($e['events'] ?? []),
        'enabled' => (bool) ($e['enabled'] ?? true), 'secretLast4' => (string) ($e['secretLast4'] ?? ''),
        'lastDeliveryAt' => $when($e['lastDeliveryAt'] ?? null), 'lastDeliveryStatus' => $e['lastDeliveryStatus'] ?? null,
    ], fn ($v) => $v !== null))->values()->all();
    $deliveries = collect($deliveries)->map(fn ($d) => array_filter([
        'id' => (string) $d['id'], 'endpointId' => (string) $d['endpointId'], 'event' => $d['event'], 'status' => $d['status'] ?? 'pending', 'code' => $d['code'] ?? null,
        'durationMs' => $d['durationMs'] ?? null, 'at' => $when($d['at']), 'attempt' => $d['attempt'] ?? 1, 'request' => $d['request'] ?? null, 'response' => $d['response'] ?? null, 'error' => $d['error'] ?? null,
    ], fn ($v) => $v !== null))->values()->all();
    $sources = collect($sources)->map(fn ($s) => array_filter([
        'id' => (string) $s['id'], 'name' => $s['name'], 'target' => $s['target'] ?? null, 'intervalSeconds' => (int) $s['intervalSeconds'],
        'lastStatus' => $s['lastStatus'] ?? null, 'lastAt' => $when($s['lastAt'] ?? null), 'lastError' => $s['lastError'] ?? null,
    ], fn ($v) => $v !== null))->values()->all();

    // Intervals: the five standard ones plus any custom one in use, with their text.
    $seconds = collect([60, 300, 900, 3600, 21600])->merge(collect($sources)->pluck('intervalSeconds'))->unique()->sort()->values()->all();
    $intervalText = function (int $n) use ($ar) {
        [$value, $unit] = $n >= 3600 && $n % 3600 === 0 ? [$n / 3600, 'hour'] : ($n >= 60 && $n % 60 === 0 ? [$n / 60, 'minute'] : [$n, 'second']);
        if ($ar) {
            return $value.' '.['second' => 'ثانية', 'minute' => 'دقيقة', 'hour' => 'ساعة'][$unit];
        }
        return $value.' '.$unit.($value === 1 ? '' : 's');
    };
    $intervalOptions = array_map(fn ($n) => ['value' => (string) $n, 'label' => $intervalText($n)], $seconds);

    $config = [
        'events' => $events, 'endpoints' => $endpoints, 'deliveries' => $deliveries, 'sources' => $sources,
        'push' => $push ? ['url' => (string) $push['url'], 'token' => (string) $push['token']] : null,
        'can' => ['toggle' => (bool) $toggle, 'rotate' => (bool) $rotate, 'test' => (bool) $test, 'replay' => (bool) $replay, 'interval' => (bool) $interval, 'poll' => (bool) $poll],
        'locale' => $ar ? 'ar' : 'en',
        'labels' => [
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ. حاول مرة أخرى.'),
            'allEvents' => $t::t('All events', 'كل الأحداث'),
            'eventsOne' => $t::t('1 event', 'حدث واحد'),
            'eventsOther' => $t::t('{n} events', '{n} أحداث'),
            'testOk' => $t::t('Test to {name} succeeded. Status {code} in {ms} ms.', 'نجحت التجربة إلى {name}. الحالة {code} خلال {ms} مللي ثانية.'),
            'testFail' => $t::t('Test to {name} failed. {detail}', 'فشلت التجربة إلى {name}. {detail}'),
            'replayed' => $t::t('Sent again to {name}.', 'أُعيد الإرسال إلى {name}.'),
            'polled' => $t::t('Polled {name}.', 'تم الاستعلام من {name}.'),
            'rotateTitle' => $t::t('Rotate the secret of {name}?', 'تدوير سر {name}؟'),
            'rotateBody' => $t::t('The old secret stops working at once. Update your receiver with the new one.', 'يتوقف السر القديم فورًا. حدّث المستقبِل بالسر الجديد.'),
            'rotateConfirm' => $t::t('Rotate secret', 'تدوير السر'),
            'deleteTitle' => $t::t('Delete {name}?', 'حذف {name}؟'),
            'deleteBody' => $t::t('Events stop being sent to it and its delivery history is removed.', 'تتوقف الأحداث عن الإرسال إليها ويُحذف سجل التسليم.'),
            'deleteConfirm' => $t::t('Delete', 'حذف'),
            'revealTitle' => $t::t('Signing secret', 'سر التوقيع'),
            'createTitle' => $t::t('Add an endpoint', 'إضافة نقطة إرسال'),
            'editTitle' => $t::t('Edit endpoint', 'تعديل النقطة'),
            'save' => $t::t('Save', 'حفظ'),
            'create' => $t::t('Create endpoint', 'إنشاء النقطة'),
            'nameRequired' => $t::t('Enter a name.', 'أدخل اسمًا.'),
            'eventsRequired' => $t::t('Pick at least one event.', 'اختر حدثًا واحدًا على الأقل.'),
            'urlProblems' => [
                'empty' => $t::t('Enter a URL.', 'أدخل رابطًا.'),
                'invalid' => $t::t('Enter a full URL such as https://example.com/hook.', 'أدخل رابطًا كاملًا مثل https://example.com/hook.'),
                'insecure' => $t::t('Use https. Plain http works only for localhost.', 'استخدم https. الـ http العادي يعمل مع localhost فقط.'),
                'credentials' => $t::t('Remove the user name and password from the URL.', 'أزل اسم المستخدم وكلمة المرور من الرابط.'),
            ],
            'statuses' => ['success' => $t::t('Delivered', 'تم التسليم'), 'failed' => $t::t('Failed', 'فشل'), 'pending' => $t::t('Pending', 'قيد الانتظار')],
            'ms' => $t::t('ms', 'مللي ثانية'),
        ],
    ];
    $statusOptions = [
        ['value' => 'success', 'label' => $config['labels']['statuses']['success'], 'tone' => 'success'],
        ['value' => 'failed', 'label' => $config['labels']['statuses']['failed'], 'tone' => 'danger'],
        ['value' => 'pending', 'label' => $config['labels']['statuses']['pending'], 'tone' => 'info'],
    ];

    $epColumns = [
        ['id' => 'name', 'header' => $t::t('Endpoint', 'النقطة'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'url', 'header' => $t::t('URL', 'الرابط'), 'searchable' => true],
        ['id' => 'channel', 'header' => $t::t('Channel', 'القناة'), 'type' => 'tag', 'sortable' => true, 'searchable' => true],
        ['id' => 'events', 'header' => $t::t('Events', 'الأحداث')],
        ['id' => 'secret', 'header' => $t::t('Secret', 'السر'), 'hidden' => true],
        ['id' => 'lastStatus', 'header' => $t::t('Last delivery', 'آخر تسليم'), 'type' => 'status', 'options' => array_merge($statusOptions, [
            ['value' => 'never', 'label' => $t::t('Never', 'أبدًا'), 'tone' => 'neutral'], ['value' => '', 'label' => '', 'tone' => 'neutral'],
        ])],
        ['id' => 'last', 'header' => $t::t('Last delivery date', 'تاريخ آخر تسليم'), 'type' => 'date', 'sortable' => true],
        ['id' => 'enabled', 'header' => $t::t('Enabled', 'مفعّلة'), 'type' => 'boolean', 'sortable' => true] + ($toggle ? ['edit' => 'switch'] : []),
    ];
    $epActions = array_values(array_filter([
        $test ? ['id' => 'ep-test', 'label' => $t::t('Send test', 'إرسال تجربة'), 'icon' => 'send', 'group' => 'use'] : null,
        ['id' => 'ep-edit', 'label' => $t::t('Edit', 'تعديل'), 'icon' => 'pencil', 'group' => 'use'],
        $rotate ? ['id' => 'ep-rotate', 'label' => $t::t('Rotate secret', 'تدوير السر'), 'icon' => 'key-round', 'group' => 'secret'] : null,
        ['id' => 'ep-delete', 'label' => $t::t('Delete', 'حذف'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'],
    ]));
    $dlColumns = [
        ['id' => 'status', 'header' => $t::t('Status', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => $statusOptions],
        ['id' => 'event', 'header' => $t::t('Event', 'الحدث'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'endpoint', 'header' => $t::t('Endpoint', 'النقطة'), 'sortable' => true, 'searchable' => true],
        ['id' => 'code', 'header' => $t::t('Response', 'الرد'), 'sortable' => true],
        ['id' => 'duration', 'header' => $t::t('Time', 'الزمن').' ('.$config['labels']['ms'].')', 'type' => 'number', 'align' => 'end', 'sortable' => true, 'hidden' => true],
        ['id' => 'attempt', 'header' => $t::t('Attempt', 'المحاولة'), 'type' => 'number', 'align' => 'end', 'sortable' => true, 'hidden' => true],
        ['id' => 'when', 'header' => $t::t('When', 'الوقت'), 'type' => 'date', 'sortable' => true],
    ];
    $dlActions = array_values(array_filter([
        ['id' => 'dl-view', 'label' => $t::t('Details', 'التفاصيل'), 'icon' => 'globe', 'group' => 'inspect'],
        $replay ? ['id' => 'dl-replay', 'label' => $t::t('Send again', 'إعادة الإرسال'), 'icon' => 'rotate-cw', 'group' => 'act'] : null,
    ]));
    $srcColumns = [
        ['id' => 'name', 'header' => $t::t('Source', 'المصدر'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'target', 'header' => $t::t('Target', 'الوجهة'), 'searchable' => true],
        ['id' => 'interval', 'header' => $t::t('Poll every', 'الاستعلام كل'), 'type' => 'tag', 'sortable' => true, 'options' => $intervalOptions] + ($interval ? ['edit' => 'select'] : []),
        ['id' => 'status', 'header' => $t::t('Last status', 'آخر حالة'), 'type' => 'status', 'sortable' => true, 'options' => [
            ['value' => 'ok', 'label' => $t::t('Healthy', 'سليم'), 'tone' => 'success'], ['value' => 'stale', 'label' => $t::t('Late', 'متأخر'), 'tone' => 'warning'],
            ['value' => 'error', 'label' => $t::t('Failing', 'يفشل'), 'tone' => 'danger'], ['value' => 'never', 'label' => $t::t('Not polled yet', 'لم يُستعلم بعد'), 'tone' => 'neutral'],
        ]],
        ['id' => 'error', 'header' => $t::t('Error', 'الخطأ'), 'searchable' => true, 'hidden' => true],
        ['id' => 'last', 'header' => $t::t('Last polled', 'آخر استعلام'), 'type' => 'date', 'sortable' => true],
    ];
    $srcActions = $poll ? [['id' => 'src-poll', 'label' => $t::t('Poll now', 'استعلم الآن'), 'icon' => 'refresh-cw']] : [];

    // The events of the form, grouped; each checkbox is bound to its index in the list.
    $groups = [];
    foreach ($events as $i => $e) {
        $groups[$e['group'] ?? ''][] = $i;
    }
    $verify = implode("\n", [
        "import { createHmac, timingSafeEqual } from 'node:crypto';", '',
        'export function verify(rawBody, headers, secret) {',
        '  const sent = Buffer.from(headers["x-signature"] ?? "", "hex");',
        '  const expected = createHmac("sha256", secret).update(rawBody).digest();',
        '  return sent.length === expected.length && timingSafeEqual(sent, expected);',
        '}',
    ]);
    $bodyClass = 'max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-control border border-border bg-muted p-3 text-start font-mono text-code text-foreground';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'webhooks-manager') }}" x-data="nqWebhooksManager(@js($config))" x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-edit="onEdit($event)"
    x-on:nq-data-table-row-click="onRowClick($event)" {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-6') }}>
    <header class="flex flex-col gap-1">
        <h2 class="text-h3 text-foreground">{{ $t::t('Webhooks', 'الويب هوك') }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ $t::t('Send events to other systems and receive events from them.', 'أرسل الأحداث إلى أنظمة أخرى واستقبل الأحداث منها.') }}</p>
    </header>

    @if ($push)
        <x-nq::card data-slot="webhooks-push" class="w-full" x-show="pushShown">
            <x-nq::card.header>
                <x-nq::card.title as="h3">{{ $t::t('Push endpoint', 'نقطة الاستقبال') }}</x-nq::card.title>
                <x-nq::card.description>{{ $t::t('Send events to this URL from another system. The token is shown once.', 'أرسل الأحداث إلى هذا الرابط من نظام آخر. الرمز يظهر مرة واحدة.') }}</x-nq::card.description>
            </x-nq::card.header>
            <x-nq::card.content class="flex flex-col gap-3">
                <x-nq::alert tone="warning">{{ $t::t('Save the token now. After you dismiss this card it cannot be shown again.', 'احفظ الرمز الآن. بعد إغلاق هذه البطاقة لا يمكن عرضه مجددًا.') }}</x-nq::alert>
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('URL', 'الرابط') }}</x-nq::field.label>
                    <x-nq::copy-button.field :value="$push['url']" :label="$t::t('URL', 'الرابط')" />
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('Token', 'الرمز') }}</x-nq::field.label>
                    <x-nq::copy-button.field :value="$push['token']" :label="$t::t('Token', 'الرمز')" />
                </x-nq::field>
                <div class="flex justify-end">
                    <x-nq::button type="button" variant="primary" x-on:click="dismissPush()">{{ $t::t('I have saved it', 'لقد حفظته') }}</x-nq::button>
                </div>
            </x-nq::card.content>
        </x-nq::card>
    @endif

    <template x-if="failure"><x-nq::alert tone="danger" dismissible x-on:nq:dismiss="failure = null"><span x-text="failure"></span></x-nq::alert></template>
    <template x-if="notice && notice.tone === 'success'"><x-nq::alert tone="success" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert></template>
    <template x-if="notice && notice.tone === 'danger'"><x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert></template>

    <x-nq::tabs default-value="endpoints">
        <x-nq::tabs.list variant="underline" aria-label="{{ $t::t('Webhooks', 'الويب هوك') }}">
            <x-nq::tabs.tab value="endpoints">{{ $t::t('Endpoints', 'نقاط الإرسال') }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="deliveries">{{ $t::t('Deliveries', 'عمليات التسليم') }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="inbound">{{ $t::t('Inbound', 'الوارد') }}</x-nq::tabs.tab>
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="endpoints" class="pt-4">
            <x-nq::card class="w-full">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t::t('Endpoints', 'نقاط الإرسال') }}</x-nq::card.title>
                    <x-nq::card.description>{{ $t::t('Where events are sent. Each request is signed with the endpoint secret.', 'المكان الذي تُرسل إليه الأحداث. كل طلب موقّع بسرّ النقطة.') }}</x-nq::card.description>
                    <x-nq::card.action>
                        <x-nq::button type="button" size="sm" variant="primary" x-on:click="openForm(null)">{{ $t::t('Add endpoint', 'إضافة نقطة') }}</x-nq::button>
                    </x-nq::card.action>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <x-nq::data-table x-model="ep.rows" :label="$t::t('Webhook endpoints', 'نقاط إرسال الويب هوك')" name-key="name" :page-size="8" :search="$t::t('Search…', 'بحث…')"
                        :columns="$epColumns" :rows="[]" :row-actions="$epActions">
                        <x-slot:empty>
                            <x-nq::states.empty icon="webhook" :title="$t::t('No endpoints yet', 'لا توجد نقاط بعد')" :description="$t::t('Add an endpoint to start sending events.', 'أضف نقطة لتبدأ إرسال الأحداث.')" class="border-0" />
                        </x-slot:empty>
                    </x-nq::data-table>
                </x-nq::card.content>
            </x-nq::card>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="deliveries" class="pt-4">
            <x-nq::card class="w-full">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t::t('Delivery log', 'سجل التسليم') }}</x-nq::card.title>
                    <x-nq::card.description>{{ $t::t('Every attempt with its response. Send a failed one again.', 'كل محاولة مع ردّها. أعد إرسال ما فشل.') }}</x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <x-nq::data-table x-model="dl.rows" :label="$t::t('Webhook deliveries', 'عمليات تسليم الويب هوك')" name-key="event" :page-size="10" :search="$t::t('Search…', 'بحث…')"
                        :columns="$dlColumns" :rows="[]" :row-actions="$dlActions" row-click>
                        <x-slot:toolbar>
                            <x-nq::select value="all" x-model="dl.filter">
                                <x-nq::select.trigger aria-label="{{ $t::t('Endpoint', 'النقطة') }}" class="w-48"><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="all">{{ $t::t('All endpoints', 'كل النقاط') }}</x-nq::select.item>
                                    @foreach ($endpoints as $e)
                                        <x-nq::select.item :value="$e['id']">{{ $e['name'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-slot:toolbar>
                        <x-slot:empty>
                            <x-nq::states.empty icon="send" :title="$t::t('No deliveries yet', 'لا توجد عمليات تسليم بعد')" class="border-0" />
                        </x-slot:empty>
                    </x-nq::data-table>
                </x-nq::card.content>
            </x-nq::card>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="inbound" class="pt-4">
            <x-nq::card class="w-full">
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $t::t('Inbound sources', 'المصادر الواردة') }}</x-nq::card.title>
                    <x-nq::card.description>{{ $t::t('Systems polled for new events.', 'أنظمة يُستعلم منها عن أحداث جديدة.') }}</x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <x-nq::data-table x-model="src.rows" :label="$t::t('Inbound sources', 'المصادر الواردة')" name-key="name" :page-size="8" :search="$t::t('Search…', 'بحث…')"
                        :columns="$srcColumns" :rows="[]" :row-actions="$srcActions">
                        <x-slot:empty>
                            <x-nq::states.empty icon="antenna" :title="$t::t('No inbound sources', 'لا توجد مصادر واردة')" class="border-0" />
                        </x-slot:empty>
                    </x-nq::data-table>
                </x-nq::card.content>
            </x-nq::card>
        </x-nq::tabs.panel>
    </x-nq::tabs>

    {{-- The add and edit form. --}}
    <x-nq::dialog x-model="form.open">
        <x-nq::dialog.content class="max-w-xl">
            <form novalidate data-slot="webhooks-endpoint-form" class="flex flex-col gap-4" x-on:submit.prevent="saveForm()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="formTitle"></span></x-nq::dialog.title>
                </x-nq::dialog.header>
                <template x-if="form.error"><x-nq::alert tone="danger"><span x-text="form.error"></span></x-nq::alert></template>
                <div class="grid gap-4 sm:grid-cols-2">
                    <x-nq::field x-model="form.invalid.name">
                        <x-nq::field.label>{{ $t::t('Name', 'الاسم') }}</x-nq::field.label>
                        <x-nq::field.input x-model="form.name" x-on:input="onFormInput()" placeholder="{{ $t::t('Order updates', 'تحديثات الطلبات') }}" autocomplete="off" />
                        <x-nq::field.error>{{ $t::t('Enter a name.', 'أدخل اسمًا.') }}</x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t::t('Channel', 'القناة') }}</x-nq::field.label>
                        <x-nq::field.input x-model="form.channel" placeholder="{{ $t::t('Slack, Discord, Custom HTTP', 'Slack، Discord، HTTP مخصص') }}" autocomplete="off" />
                        <x-nq::field.description>{{ $t::t('A name for where this goes. Text only.', 'اسم للوجهة. نص فقط.') }}</x-nq::field.description>
                    </x-nq::field>
                </div>
                <x-nq::field x-model="form.invalid.url">
                    <x-nq::field.label>{{ $t::t('URL', 'الرابط') }}</x-nq::field.label>
                    <x-nq::field.input x-model="form.url" x-on:input="onFormInput()" ltr type="url" placeholder="https://example.com/hooks/nasaq" autocomplete="off" spellcheck="false" />
                    <x-nq::field.error><span x-text="form.urlMessage"></span></x-nq::field.error>
                </x-nq::field>
                <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                    <legend class="mb-1 text-label text-foreground">{{ $t::t('Events', 'الأحداث') }}</legend>
                    <div class="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-control border border-border p-3">
                        @foreach ($groups as $group => $indexes)
                            <div class="flex flex-col gap-1.5">
                                <div class="flex items-center justify-between gap-2 text-label text-foreground">
                                    <span>{{ $group !== '' ? $group : $t::t('All', 'الكل') }}</span>
                                    <x-nq::button type="button" variant="ghost" size="sm" data-slot="webhooks-group-toggle" x-on:click="toggleGroup([{{ implode(',', $indexes) }}])">
                                        {{ $t::t('All', 'الكل') }} <span class="text-muted-foreground" dir="ltr" x-text="groupCount([{{ implode(',', $indexes) }}])"></span>
                                    </x-nq::button>
                                </div>
                                <div class="grid gap-1.5 ps-6 sm:grid-cols-2">
                                    @foreach ($indexes as $i)
                                        <label class="flex items-center gap-2 text-body-sm text-foreground">
                                            <x-nq::checkbox x-model="form.sel[{{ $i }}]" x-on:click="$nextTick(() => onFormInput())" />
                                            <span class="min-w-0">
                                                <span dir="auto">{{ $events[$i]['label'] }}</span>
                                                <bdi dir="ltr" class="block truncate font-mono text-caption text-muted-foreground">{{ $events[$i]['id'] }}</bdi>
                                            </span>
                                        </label>
                                    @endforeach
                                </div>
                            </div>
                        @endforeach
                    </div>
                    <p class="text-caption text-nq-danger-text" x-show="form.eventsInvalid" style="display: none">{{ $t::t('Pick at least one event.', 'اختر حدثًا واحدًا على الأقل.') }}</p>
                </fieldset>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="form.open = false" x-bind:disabled="form.pending ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="form.pending ? 'true' : null">
                        <x-nq::spinner x-show="form.pending" style="display: none" />
                        <span x-text="formSubmit"></span>
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- A new or rotated secret, shown once. --}}
    <x-nq::dialog x-model="reveal.open">
        <x-nq::dialog.content :show-close="false" class="max-w-lg">
            <div data-slot="webhooks-reveal" class="flex flex-col gap-4">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="reveal.title"></span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t::t('Copy the secret now. It is shown once and cannot be recovered.', 'انسخ السر الآن. يظهر مرة واحدة ولا يمكن استرجاعه.') }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::alert tone="warning">{{ $t::t("Store it in your receiver's configuration. If you lose it, rotate the secret.", 'احفظه في إعدادات المستقبِل. إذا فقدته فدوّر السر.') }}</x-nq::alert>
                <x-nq::input-group>
                    <x-nq::input-group.input readonly ltr x-bind:value="reveal.secret" aria-label="{{ $t::t('Signing secret', 'سر التوقيع') }}" x-on:focus="$el.select()" />
                    <x-nq::input-group.addon align="end">
                        <x-nq::button type="button" variant="ghost" size="icon-sm" data-slot="webhooks-copy-secret" aria-label="{{ $t::t('Copy', 'نسخ') }}" x-on:click="copySecret()">
                            <x-lucide-copy aria-hidden="true" x-show="! reveal.copied" />
                            <x-lucide-check aria-hidden="true" x-show="reveal.copied" style="display: none" />
                        </x-nq::button>
                    </x-nq::input-group.addon>
                </x-nq::input-group>
                <div class="flex flex-col gap-2">
                    <p class="text-label text-foreground">{{ $t::t('Verify the signature', 'التحقق من التوقيع') }}</p>
                    <p class="text-caption text-muted-foreground">{{ $t::t('Sign the raw request body with the secret and compare it to the X-Signature header.', 'وقّع نص الطلب الخام بالسر وقارنه بترويسة X-Signature.') }}</p>
                    <x-nq::code-block :code="$verify" language="js" />
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="primary" x-on:click="reveal.open = false; reveal.secret = ''">{{ $t::t('Done', 'تم') }}</x-nq::button>
                </x-nq::dialog.footer>
            </div>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- One delivery with its request and response. --}}
    <x-nq::dialog x-model="detail.open">
        <x-nq::dialog.content class="max-w-2xl">
            <div data-slot="webhooks-delivery" class="flex flex-col gap-4">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t::t('Delivery', 'عملية التسليم') }}</x-nq::dialog.title>
                    <x-nq::dialog.description>
                        <bdi dir="ltr" class="font-mono" x-text="detail.event"></bdi>
                        <span dir="auto">· <span x-text="detail.name"></span></span>
                    </x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
                    <div class="flex flex-wrap items-center gap-3 text-body-sm">
                        <x-nq::status tone="success" x-show="detail.status === 'success'" style="display: none">{{ $config['labels']['statuses']['success'] }}</x-nq::status>
                        <x-nq::status tone="danger" x-show="detail.status === 'failed'" style="display: none">{{ $config['labels']['statuses']['failed'] }}</x-nq::status>
                        <x-nq::status tone="info" x-show="detail.status === 'pending'" style="display: none">{{ $config['labels']['statuses']['pending'] }}</x-nq::status>
                        <span x-show="detail.code" style="display: none" x-text="detail.code"></span>
                        <span x-show="detail.duration" style="display: none" x-text="detail.duration"></span>
                        <span class="text-muted-foreground">{{ $t::t('Attempt', 'المحاولة') }} <span x-text="detail.attempt"></span></span>
                        <span class="text-muted-foreground" x-text="detail.at"></span>
                    </div>
                    <template x-if="detail.error"><x-nq::alert tone="danger"><span x-text="detail.error"></span></x-nq::alert></template>
                    <section class="flex flex-col gap-1.5">
                        <h4 class="text-label text-foreground">{{ $t::t('Request body', 'نص الطلب') }}</h4>
                        <pre dir="ltr" data-slot="webhooks-request" class="{{ $bodyClass }}" x-show="detail.request" style="display: none" x-text="detail.request"></pre>
                        <p class="text-caption text-muted-foreground" x-show="! detail.request" style="display: none">{{ $t::t('Nothing recorded.', 'لم يُسجَّل شيء.') }}</p>
                    </section>
                    <section class="flex flex-col gap-1.5">
                        <h4 class="text-label text-foreground">{{ $t::t('Response body', 'نص الرد') }}</h4>
                        <pre dir="ltr" data-slot="webhooks-response" class="{{ $bodyClass }}" x-show="detail.response" style="display: none" x-text="detail.response"></pre>
                        <p class="text-caption text-muted-foreground" x-show="! detail.response" style="display: none">{{ $t::t('Nothing recorded.', 'لم يُسجَّل شيء.') }}</p>
                    </section>
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="detail.open = false">{{ $t::t('Close', 'إغلاق') }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" x-show="detail.canReplay" style="display: none" x-on:click="replayFromDetail()" x-bind:aria-busy="busy[detail.id] ? 'true' : null">
                        <x-nq::spinner x-show="busy[detail.id]" style="display: none" />
                        {{ $t::t('Send again', 'إعادة الإرسال') }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </div>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- Delete and rotate ask first. --}}
    <x-nq::alert-dialog x-model="confirm.open">
        <x-nq::alert-dialog.content>
            <div data-slot="webhooks-confirm" class="grid gap-4">
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="confirm.title"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description><span x-text="confirm.body"></span></x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="runConfirm()"><span x-text="confirm.label"></span></x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </div>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>

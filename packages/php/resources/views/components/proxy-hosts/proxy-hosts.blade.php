{{-- <x-nq::proxy-hosts :hosts="$hosts" @save-host="$event.detail.wait(…)" @delete-host="…" @toggle-host="…" />
     Reverse-proxy hosts: a table of domains and where they forward to, with the TLS mode, WebSocket support, status and an enabled switch, and a dialog editor (domains, upstream, TLS mode, WebSockets, enabled).
     Row actions (edit, delete) also open as a context menu. Built on x-nq::data-table. Needs the Alpine runtime (@nasaqScripts).
     hosts: [['id', 'hosts' => ['app.example.com', 'www.example.com'] (the first is the main one), 'upstream' => 'http://10.0.0.5:3000', 'tlsMode' => off | auto | custom | passthrough, 'websockets' => true, 'enabled' => true, 'status' => online | offline | unknown]].
     toggle: false hides the Enabled switch (shown by default). labels: override any string, e.g. ['add' => 'New host'].
     It is presentational: it fires events on the root with detail { …, wait(promise) }; your handler talks to the proxy. Resolve, or resolve { error } shown in the dialog or in an alert above the table.
       save-host    { id?, hosts, upstream, tlsMode, websockets, enabled }   resolve { error?, id? }; a new host takes the id you return
       delete-host  { id }                                                  resolve { error? }
       toggle-host  { id, enabled }                                         the switch in the table; an error rolls the switch back and is shown
     After a success the table is updated in the page. A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the domains cell shows up to three domains as chips, then "+N more" as text (no popover), and the WebSockets column reads Yes / No. --}}
@props(['hosts' => [], 'toggle' => true, 'labels' => [], 'label' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $L = array_merge([
        'add' => $t::t('Add proxy host', 'إضافة مضيف وكيل'), 'table' => $t::t('Proxy hosts', 'مضيفو الوكيل'), 'search' => $t::t('Search hosts', 'بحث في المضيفين'),
        'hosts' => $t::t('Domains', 'النطاقات'), 'upstream' => $t::t('Forwards to', 'يُحوَّل إلى'), 'tls' => $t::t('TLS', 'TLS'), 'websockets' => $t::t('WebSockets', 'WebSockets'),
        'status' => $t::t('Status', 'الحالة'), 'enabled' => $t::t('Enabled', 'مفعّل'),
        'edit' => $t::t('Edit', 'تعديل'), 'remove' => $t::t('Delete', 'حذف'),
        'empty' => $t::t('No proxy hosts yet. Add one to forward a domain to an app.', 'لا يوجد مضيفو وكيل بعد. أضف واحدًا لتحويل نطاق إلى تطبيق.'),
        'dialogNew' => $t::t('New proxy host', 'مضيف وكيل جديد'), 'dialogEdit' => $t::t('Edit proxy host', 'تعديل مضيف الوكيل'),
        'dialogBody' => $t::t('Requests to these domains are forwarded to the upstream.', 'تُحوَّل الطلبات إلى هذه النطاقات نحو الخادم الخلفي.'),
        'domains' => $t::t('Domain names', 'أسماء النطاقات'), 'hostsHint' => $t::t('One or more, separated by spaces, commas or new lines.', 'واحد أو أكثر، تفصل بينها مسافات أو فواصل أو أسطر.'),
        'upstreamLabel' => $t::t('Upstream address', 'عنوان الخادم الخلفي'), 'upstreamHint' => $t::t('Where requests are sent, like http://10.0.0.5:3000.', 'الوجهة التي تُرسل إليها الطلبات مثل http://10.0.0.5:3000.'),
        'websocketsLabel' => $t::t('WebSocket support', 'دعم WebSocket'), 'websocketsHint' => $t::t('Keeps upgraded connections open. Turn on for live apps and chat.', 'يُبقي الاتصالات المرقّاة مفتوحة. فعّله للتطبيقات الحية والدردشة.'),
        'save' => $t::t('Save proxy host', 'حفظ مضيف الوكيل'), 'cancel' => $t::t('Cancel', 'إلغاء'),
        'deleteTitle' => $t::t('Delete the proxy host for {name}?', 'حذف مضيف الوكيل لـ {name}؟'),
        'deleteBody' => $t::t('Requests to these domains stop being forwarded. The app itself is not touched.', 'يتوقف تحويل الطلبات إلى هذه النطاقات. لا يتأثر التطبيق نفسه.'),
        'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'), 'more' => $t::t('+{n} more', '+{n} أخرى'),
        'errHosts' => $t::t('Enter valid domain names, like app.example.com.', 'أدخل أسماء نطاقات صحيحة مثل app.example.com.'),
        'errUpstream' => $t::t('Enter an address like http://10.0.0.5:3000.', 'أدخل عنوانًا مثل http://10.0.0.5:3000.'),
        'yes' => $t::t('Yes', 'نعم'), 'no' => $t::t('No', 'لا'),
    ], (array) $labels);
    $tlsModes = [
        'off' => $t::t('Off (HTTP only)', 'متوقف (HTTP فقط)'), 'auto' => $t::t('Automatic certificate', 'شهادة تلقائية'),
        'custom' => $t::t('Custom certificate', 'شهادة مخصصة'), 'passthrough' => $t::t('Passthrough', 'تمرير مباشر'),
    ];
    $tlsShort = ['off' => $t::t('Off', 'متوقف'), 'auto' => $t::t('Auto', 'تلقائي'), 'custom' => $t::t('Custom', 'مخصص'), 'passthrough' => $t::t('Passthrough', 'تمرير')];
    $tlsHint = [
        'off' => $t::t('Traffic between visitors and the proxy is not encrypted.', 'حركة الزوار نحو الوكيل غير مشفرة.'),
        'auto' => $t::t('A certificate is issued and renewed for you.', 'تُصدر الشهادة وتُجدَّد تلقائيًا.'),
        'custom' => $t::t('You upload the certificate and key on the certificates page.', 'ترفع الشهادة والمفتاح من صفحة الشهادات.'),
        'passthrough' => $t::t('Encrypted traffic goes to the upstream untouched. The upstream must hold the certificate.', 'تصل الحركة المشفرة إلى الخادم الخلفي كما هي، ويجب أن تكون الشهادة عنده.'),
    ];
    $states = ['online' => $t::t('Online', 'متصل'), 'offline' => $t::t('Unreachable', 'لا يمكن الوصول'), 'unknown' => $t::t('Not checked', 'لم يُفحص')];
    $items = collect($hosts)->map(fn ($h) => [
        'id' => (string) $h['id'], 'hosts' => array_values((array) $h['hosts']), 'upstream' => (string) $h['upstream'], 'tlsMode' => $h['tlsMode'] ?? 'auto',
        'websockets' => (bool) ($h['websockets'] ?? false), 'enabled' => (bool) ($h['enabled'] ?? true), 'status' => $h['status'] ?? 'unknown',
    ])->values()->all();
    $config = ['hosts' => $items, 'can' => ['toggle' => (bool) $toggle], 'labels' => ['genericError' => $L['genericError'], 'deleteTitle' => $L['deleteTitle'], 'more' => $L['more']]];
    $columns = [
        ['id' => 'hosts', 'key' => 'hostsText', 'header' => $L['hosts'], 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'upstream', 'header' => $L['upstream'], 'type' => 'mono', 'sortable' => true, 'searchable' => true],
        ['id' => 'tls', 'header' => $L['tls'], 'type' => 'tag', 'sortable' => true, 'options' => array_map(fn ($k) => ['value' => $k, 'label' => $tlsShort[$k]], array_keys($tlsShort))],
        ['id' => 'ws', 'header' => $L['websockets'], 'type' => 'boolean'],
        ['id' => 'status', 'header' => $L['status'], 'type' => 'status', 'sortable' => true, 'options' => [
            ['value' => 'online', 'label' => $states['online'], 'tone' => 'success'], ['value' => 'offline', 'label' => $states['offline'], 'tone' => 'danger'], ['value' => 'unknown', 'label' => $states['unknown'], 'tone' => 'neutral'],
        ]],
    ];
    if ($toggle) {
        $columns[] = ['id' => 'enabled', 'header' => $L['enabled'], 'type' => 'boolean', 'align' => 'end', 'edit' => 'switch'];
    }
    $actions = [
        ['id' => 'edit', 'label' => $L['edit'], 'icon' => 'pencil', 'group' => 'edit'],
        ['id' => 'delete', 'label' => $L['remove'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'proxy-hosts') }}" x-data="nqProxyHosts(@js($config))" x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-edit="onEdit($event)"
    {{ $attributes->except('data-slot')->cn('grid w-full gap-3') }}>
    <template x-if="notice"><x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert></template>

    <x-nq::data-table x-model="table.rows" :label="$label ?? $L['table']" name-key="hostsText" :search="$L['search']" :columns="$columns" :rows="[]" :row-actions="$actions" :view-options="false">
        <x-slot:toolbar>
            <x-nq::button type="button" size="sm" variant="primary" class="ms-auto" x-on:click="openForm(null)"><x-lucide-plus aria-hidden="true" />{{ $L['add'] }}</x-nq::button>
        </x-slot:toolbar>
        <x-slot name="cell_hosts">
            <span class="flex flex-wrap items-center gap-1.5">
                <template x-for="h in row.shown" x-bind:key="h"><span class="inline-flex items-center rounded-control border border-border bg-secondary px-2 py-0.5 text-body-sm text-foreground"><bdi dir="ltr" x-text="h"></bdi></span></template>
                <span class="text-caption text-muted-foreground" x-show="row.more" style="display: none" x-text="row.more"></span>
            </span>
        </x-slot>
        <x-slot:empty><x-nq::states.empty icon="network" :title="$L['empty']" class="border-0" /></x-slot:empty>
    </x-nq::data-table>

    {{-- The add / edit dialog. --}}
    <x-nq::dialog x-model="form.open">
        <x-nq::dialog.content>
            <form novalidate data-slot="proxy-host-dialog" class="grid gap-4" x-on:submit.prevent="saveForm()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-show="! form.editingId">{{ $L['dialogNew'] }}</span><span x-show="form.editingId" style="display: none">{{ $L['dialogEdit'] }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $L['dialogBody'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <template x-if="form.error"><x-nq::alert tone="danger"><span x-text="form.error"></span></x-nq::alert></template>
                <x-nq::field x-model="form.invalid.hosts">
                    <x-nq::field.label>{{ $L['domains'] }}</x-nq::field.label>
                    <x-nq::field.textarea x-model="form.hostsText" x-on:input="onFormInput()" dir="ltr" rows="3" placeholder="app.example.com" class="font-mono text-body-sm" />
                    <x-nq::field.error>{{ $L['errHosts'] }}</x-nq::field.error>
                    <x-nq::field.description>{{ $L['hostsHint'] }}</x-nq::field.description>
                </x-nq::field>
                <x-nq::field x-model="form.invalid.upstream">
                    <x-nq::field.label>{{ $L['upstreamLabel'] }}</x-nq::field.label>
                    <x-nq::field.input x-model="form.upstream" x-on:input="onFormInput()" ltr placeholder="http://10.0.0.5:3000" autocomplete="off" spellcheck="false" />
                    <x-nq::field.error>{{ $L['errUpstream'] }}</x-nq::field.error>
                    <x-nq::field.description>{{ $L['upstreamHint'] }}</x-nq::field.description>
                </x-nq::field>
                <div class="flex flex-col gap-1.5">
                    <span id="proxy-tls" class="text-label text-foreground">{{ $L['tls'] }}</span>
                    <x-nq::select value="auto" x-model="form.tls">
                        <x-nq::select.trigger aria-labelledby="proxy-tls"><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($tlsModes as $mode => $text)
                                <x-nq::select.item :value="$mode">{{ $text }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                    @foreach ($tlsHint as $mode => $text)
                        <p class="text-body-sm text-muted-foreground" x-show="form.tls === '{{ $mode }}'" @if ($mode !== 'auto') style="display: none" @endif>{{ $text }}</p>
                    @endforeach
                </div>
                <div class="flex items-start justify-between gap-4" x-bind:class="wsBlocked ? 'opacity-50' : ''">
                    <div class="min-w-0">
                        <p id="proxy-ws" class="text-label text-foreground">{{ $L['websocketsLabel'] }}</p>
                        <p class="text-body-sm text-muted-foreground">{{ $L['websocketsHint'] }}</p>
                    </div>
                    <div x-bind:class="wsBlocked ? 'pointer-events-none' : ''" x-bind:inert="wsBlocked">
                        <x-nq::switch aria-labelledby="proxy-ws" x-model="form.websockets" />
                    </div>
                </div>
                <div class="flex items-center justify-between gap-4">
                    <p id="proxy-enabled" class="text-label text-foreground">{{ $L['enabled'] }}</p>
                    <x-nq::switch aria-labelledby="proxy-enabled" :checked="true" x-model="form.enabled" />
                </div>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="form.open = false" x-bind:disabled="form.pending ? '' : null">{{ $L['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="form.pending ? 'true' : null">
                        <x-nq::spinner x-show="form.pending" style="display: none" />
                        {{ $L['save'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- Delete asks first. --}}
    <x-nq::alert-dialog x-model="confirm.open">
        <x-nq::alert-dialog.content>
            <div data-slot="proxy-hosts-confirm" class="grid gap-4">
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="confirm.title"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $L['deleteBody'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $L['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="runConfirm()">{{ $L['remove'] }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </div>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>

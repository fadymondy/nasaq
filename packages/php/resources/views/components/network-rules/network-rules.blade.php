{{-- <x-nq::network-rules :firewall="$firewall" :http="$http" @apply-firewall="$event.detail.wait(…)" @apply-http="…" />
     A network rules editor in two tabs: firewall rules (allow or deny, protocol, port, source, ordered, first match wins) and HTTP rules (redirects, headers, basic auth, IP allow and block).
     Every edit is staged in the page, marked New, Edited or Removed, and only sent when the user presses Apply.
     firewall: [['id', 'action' => allow | deny, 'protocol' => tcp | udp | icmp | any, 'port' => '443' | '8000-8100' | '', 'source' => 'any' | '10.0.0.0/24', 'note']].
     http (leave out to hide the HTTP tab): [['id', 'type' => redirect | header | basic-auth | ip-allow | ip-deny, 'path' => '/', and per type: 'target' + 'status' (301, 302, 307, 308) | 'name' + 'value' | 'username' | 'cidr']].
     default-tab: firewall (default) | http.
     It is presentational: it fires events on the root with detail { rules, wait(promise) } where rules is the whole list to send; your handler talks to the server.
       apply-firewall / apply-http   resolve, or resolve { error } shown above the table.
     After success the staged list becomes the applied one (an HTTP password is dropped: it is write-only). A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the table cells are text (the state column is a status; removed rows are not struck through), the row menu (and right-click, long-press or Shift+F10 on a row) shows only the actions that apply (Move up not on the first row, Move down not on the last,
     Undo remove only on a removed row, nothing else on one), the table's own search is used and its columns do not hide per breakpoint.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['firewall' => [], 'http' => null, 'defaultTab' => 'firewall'])
@php
    $t = \Nasaq\Nasaq::class;
    $hasHttp = $http !== null;
    $clean = fn ($rules) => collect($rules)->map(fn ($r) => array_filter($r, fn ($v) => $v !== null))->map(fn ($r) => ['id' => (string) $r['id']] + $r)->values()->all();
    $en = ['one' => '1 change staged', 'two' => '{n} changes staged', 'few' => '{n} changes staged', 'many' => '{n} changes staged'];
    $ar = ['one' => 'تغيير واحد مرحلي', 'two' => 'تغييران مرحليان', 'few' => '{n} تغييرات مرحلية', 'many' => '{n} تغييرًا مرحليًا'];
    $config = [
        'firewall' => $clean($firewall),
        'http' => $hasHttp ? $clean($http) : null,
        'labels' => [
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
            'applied' => $t::t('Changes applied.', 'تم تطبيق التغييرات.'),
            'anySource' => $t::t('Any', 'أي مصدر'),
            'upToDate' => $t::t('Everything is applied.', 'كل شيء مطبَّق.'),
            'stagedHint' => $t::t('Nothing has changed on the server yet.', 'لم يتغير شيء على الخادم بعد.'),
            'lockout' => $t::t('A deny rule for SSH (port 22) from any address comes before every allow rule. Applying it can lock you out.', 'توجد قاعدة رفض لـ SSH (المنفذ 22) من أي عنوان قبل كل قواعد السماح. قد يؤدي تطبيقها إلى إغلاق الوصول عليك.'),
            'ruleTitleNew' => $t::t('New rule', 'قاعدة جديدة'),
            'ruleTitleEdit' => $t::t('Edit rule', 'تعديل القاعدة'),
            'staged' => $t::rtl() ? $ar : $en,
        ],
    ];
    $states = [
        ['value' => 'unchanged', 'label' => '', 'tone' => 'neutral'],
        ['value' => 'added', 'label' => $t::t('New', 'جديدة'), 'tone' => 'success'],
        ['value' => 'changed', 'label' => $t::t('Edited', 'معدّلة'), 'tone' => 'info'],
        ['value' => 'removed', 'label' => $t::t('Removed', 'محذوفة'), 'tone' => 'danger'],
    ];
    $protocols = ['tcp' => 'TCP', 'udp' => 'UDP', 'icmp' => 'ICMP', 'any' => $t::t('Any', 'الكل')];
    $httpTypes = [
        'redirect' => $t::t('Redirect', 'إعادة توجيه'), 'header' => $t::t('Set header', 'ضبط رأس'), 'basic-auth' => $t::t('Password', 'كلمة مرور'),
        'ip-allow' => $t::t('Allow IPs', 'السماح لعناوين'), 'ip-deny' => $t::t('Block IPs', 'حظر عناوين'),
    ];
    $statusLabels = [301 => $t::t('301 Moved permanently', '301 نقل دائم'), 302 => $t::t('302 Found', '302 موجود'), 307 => $t::t('307 Temporary redirect', '307 إعادة مؤقتة'), 308 => $t::t('308 Permanent redirect', '308 إعادة دائمة')];
    $fwColumns = [
        ['id' => 'order', 'header' => '#'],
        ['id' => 'action', 'header' => $t::t('Action', 'الإجراء'), 'type' => 'status', 'options' => [
            ['value' => 'allow', 'label' => $t::t('Allow', 'سماح'), 'tone' => 'success'], ['value' => 'deny', 'label' => $t::t('Deny', 'رفض'), 'tone' => 'danger'],
        ]],
        ['id' => 'protocol', 'header' => $t::t('Protocol and port', 'البروتوكول والمنفذ'), 'searchable' => true],
        ['id' => 'source', 'header' => $t::t('Source', 'المصدر'), 'searchable' => true],
        ['id' => 'note', 'header' => $t::t('Note', 'ملاحظة'), 'searchable' => true],
        ['id' => 'state', 'header' => $t::t('State', 'الحالة'), 'type' => 'status', 'options' => $states],
    ];
    $fwActions = [
        ['id' => 'fw-edit', 'label' => $t::t('Edit', 'تعديل'), 'icon' => 'pencil', 'group' => 'edit', 'visibleWhen' => ['field' => 'state', 'ne' => 'removed']],
        ['id' => 'fw-up', 'label' => $t::t('Move up', 'نقل لأعلى'), 'icon' => 'arrow-up', 'group' => 'order', 'visibleWhen' => ['all' => [['field' => 'pos', 'notIn' => ['first', 'only']], ['field' => 'state', 'ne' => 'removed']]]],
        ['id' => 'fw-down', 'label' => $t::t('Move down', 'نقل لأسفل'), 'icon' => 'arrow-down', 'group' => 'order', 'visibleWhen' => ['all' => [['field' => 'pos', 'notIn' => ['last', 'only']], ['field' => 'state', 'ne' => 'removed']]]],
        ['id' => 'fw-restore', 'label' => $t::t('Undo remove', 'تراجع عن الإزالة'), 'icon' => 'rotate-ccw', 'group' => 'order', 'visibleWhen' => ['field' => 'state', 'eq' => 'removed']],
        ['id' => 'fw-remove', 'label' => $t::t('Remove', 'إزالة'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger', 'visibleWhen' => ['field' => 'state', 'ne' => 'removed']],
    ];
    $htColumns = [
        ['id' => 'type', 'header' => $t::t('Type', 'النوع'), 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => array_map(
            fn ($k) => ['value' => $k, 'label' => $httpTypes[$k], 'tone' => $k === 'ip-deny' ? 'danger' : ($k === 'ip-allow' ? 'success' : 'neutral')], array_keys($httpTypes))],
        ['id' => 'path', 'header' => $t::t('Path', 'المسار'), 'searchable' => true],
        ['id' => 'detail', 'header' => $t::t('Detail', 'التفاصيل'), 'searchable' => true],
        ['id' => 'state', 'header' => $t::t('State', 'الحالة'), 'type' => 'status', 'options' => $states],
    ];
    $htActions = [
        ['id' => 'ht-edit', 'label' => $t::t('Edit', 'تعديل'), 'icon' => 'pencil', 'group' => 'edit', 'visibleWhen' => ['field' => 'state', 'ne' => 'removed']],
        ['id' => 'ht-restore', 'label' => $t::t('Undo remove', 'تراجع عن الإزالة'), 'icon' => 'rotate-ccw', 'group' => 'edit', 'visibleWhen' => ['field' => 'state', 'eq' => 'removed']],
        ['id' => 'ht-remove', 'label' => $t::t('Remove', 'إزالة'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger', 'visibleWhen' => ['field' => 'state', 'ne' => 'removed']],
    ];
    $barClass = 'flex flex-wrap items-center gap-3 rounded-control border px-3 py-2';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'network-rules') }}" x-data="nqNetworkRules(@js($config))" x-on:nq-data-table-action="onAction($event)" {{ $attributes->except('data-slot')->cn('w-full') }}>
    <x-nq::tabs :default-value="$defaultTab">
        <x-nq::tabs.list variant="underline" aria-label="{{ $t::t('Firewall', 'جدار الحماية') }}">
            <x-nq::tabs.tab value="firewall">{{ $t::t('Firewall', 'جدار الحماية') }}</x-nq::tabs.tab>
            @if ($hasHttp)
                <x-nq::tabs.tab value="http">{{ $t::t('HTTP rules', 'قواعد HTTP') }}</x-nq::tabs.tab>
            @endif
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="firewall" class="pt-4">
            <div class="grid gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="min-w-0 flex-1 text-body-sm text-muted-foreground">{{ $t::t('Rules run from the top and the first match wins. Changes stay staged until you apply them.', 'تُنفَّذ القواعد من الأعلى وتنطبق أول قاعدة مطابقة. تبقى التغييرات مرحلية حتى تطبّقها.') }}</p>
                    <x-nq::button type="button" size="sm" variant="secondary" x-on:click="openFirewall(null)">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $t::t('Add rule', 'إضافة قاعدة') }}
                    </x-nq::button>
                </div>
                <template x-if="fwRisk"><x-nq::alert tone="warning"><span x-text="config.labels.lockout"></span></x-nq::alert></template>
                <template x-if="fw.ok"><x-nq::alert tone="success" dismissible x-on:nq:dismiss="fw.ok = null"><span x-text="fw.ok"></span></x-nq::alert></template>
                <template x-if="fw.err"><x-nq::alert tone="danger" dismissible x-on:nq:dismiss="fw.err = null"><span x-text="fw.err"></span></x-nq::alert></template>
                <x-nq::data-table x-model="fw.rows" :label="$t::t('Firewall rules', 'قواعد جدار الحماية')" name-key="protocol" :view-options="false"
                    :search="$t::t('Search rules', 'بحث في القواعد')" :columns="$fwColumns" :rows="[]" :row-actions="$fwActions"
                    :labels="['empty' => $t::t('No firewall rules. All traffic follows the default policy.', 'لا توجد قواعد. تتبع كل الحركة السياسة الافتراضية.')]" />
                <div data-slot="network-rules-apply" x-bind:data-dirty="fwCount !== 0 ? '' : null"
                    class="{{ $barClass }}" x-bind:class="fwCount !== 0 ? 'border-nq-warning/40 bg-nq-warning-soft' : 'border-border bg-card'">
                    <div class="min-w-0 flex-1">
                        <p class="text-label text-foreground" role="status" x-text="fwSummary"></p>
                        <p class="text-body-sm text-muted-foreground" x-show="fwCount !== 0" style="display: none" x-text="fwHint"></p>
                    </div>
                    <x-nq::button type="button" variant="ghost" size="sm" x-on:click="discard('fw')" x-bind:disabled="fwCount === 0 || fw.applying ? '' : null">{{ $t::t('Discard', 'تجاهل') }}</x-nq::button>
                    <x-nq::button type="button" variant="primary" size="sm" x-on:click="apply('fw')" x-bind:disabled="fwCount === 0 ? '' : null" x-bind:aria-busy="fw.applying ? 'true' : null">
                        <x-nq::spinner x-show="fw.applying" style="display: none" />
                        {{ $t::t('Apply changes', 'تطبيق التغييرات') }}
                    </x-nq::button>
                </div>
            </div>
        </x-nq::tabs.panel>

        @if ($hasHttp)
            <x-nq::tabs.panel value="http" class="pt-4">
                <div class="grid gap-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <p class="min-w-0 flex-1 text-body-sm text-muted-foreground">{{ $t::t('Redirects, headers, passwords and IP limits for web requests. Changes stay staged until you apply them.', 'إعادة توجيه ورؤوس وكلمات مرور وقيود عناوين لطلبات الويب. تبقى التغييرات مرحلية حتى تطبّقها.') }}</p>
                        <x-nq::button type="button" size="sm" variant="secondary" x-on:click="openHttp(null)">
                            <x-lucide-plus aria-hidden="true" />
                            {{ $t::t('Add rule', 'إضافة قاعدة') }}
                        </x-nq::button>
                    </div>
                    <template x-if="ht.ok"><x-nq::alert tone="success" dismissible x-on:nq:dismiss="ht.ok = null"><span x-text="ht.ok"></span></x-nq::alert></template>
                    <template x-if="ht.err"><x-nq::alert tone="danger" dismissible x-on:nq:dismiss="ht.err = null"><span x-text="ht.err"></span></x-nq::alert></template>
                    <x-nq::data-table x-model="ht.rows" :label="$t::t('HTTP rules', 'قواعد HTTP')" name-key="path" :view-options="false"
                        :search="$t::t('Search rules', 'بحث في القواعد')" :columns="$htColumns" :rows="[]" :row-actions="$htActions"
                        :labels="['empty' => $t::t('No HTTP rules yet.', 'لا توجد قواعد HTTP بعد.')]" />
                    <div data-slot="network-rules-apply" x-bind:data-dirty="htCount !== 0 ? '' : null"
                        class="{{ $barClass }}" x-bind:class="htCount !== 0 ? 'border-nq-warning/40 bg-nq-warning-soft' : 'border-border bg-card'">
                        <div class="min-w-0 flex-1">
                            <p class="text-label text-foreground" role="status" x-text="htSummary"></p>
                            <p class="text-body-sm text-muted-foreground" x-show="htCount !== 0" style="display: none" x-text="config.labels.stagedHint"></p>
                        </div>
                        <x-nq::button type="button" variant="ghost" size="sm" x-on:click="discard('ht')" x-bind:disabled="htCount === 0 || ht.applying ? '' : null">{{ $t::t('Discard', 'تجاهل') }}</x-nq::button>
                        <x-nq::button type="button" variant="primary" size="sm" x-on:click="apply('ht')" x-bind:disabled="htCount === 0 ? '' : null" x-bind:aria-busy="ht.applying ? 'true' : null">
                            <x-nq::spinner x-show="ht.applying" style="display: none" />
                            {{ $t::t('Apply changes', 'تطبيق التغييرات') }}
                        </x-nq::button>
                    </div>
                </div>
            </x-nq::tabs.panel>
        @endif
    </x-nq::tabs>

    <x-nq::dialog x-model="fw.open">
        <x-nq::dialog.content>
            <form novalidate data-slot="network-rule-dialog" class="grid gap-4" x-on:submit.prevent="saveFirewall()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="fwTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t::t('Saved to the staged list. It only takes effect when you apply.', 'تُحفظ في القائمة المرحلية ولا تسري إلا عند التطبيق.') }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="grid gap-4 sm:grid-cols-2">
                    <x-nq::field>
                        <x-nq::field.label>{{ $t::t('Action', 'الإجراء') }}</x-nq::field.label>
                        <x-nq::select value="allow" x-model="ff.action">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                <x-nq::select.item value="allow">{{ $t::t('Allow', 'سماح') }}</x-nq::select.item>
                                <x-nq::select.item value="deny">{{ $t::t('Deny', 'رفض') }}</x-nq::select.item>
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t::t('Protocol', 'البروتوكول') }}</x-nq::field.label>
                        <x-nq::select value="tcp" x-model="ff.protocol">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($protocols as $k => $label)
                                    <x-nq::select.item :value="$k">{{ $label }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                </div>
                <x-nq::field x-model="ff.portInvalid">
                    <x-nq::field.label>{{ $t::t('Port', 'المنفذ') }}</x-nq::field.label>
                    <x-nq::field.input x-model="ff.port" x-on:input="onFirewallInput()" x-bind:disabled="ffHasPort ? null : ''" ltr placeholder="443" autocomplete="off" />
                    <x-nq::field.description>{{ $t::t('A port like 443, or a range like 8000-8100.', 'منفذ مثل 443 أو نطاق مثل 8000-8100.') }}</x-nq::field.description>
                    <x-nq::field.error>{{ $t::t('Enter a port from 1 to 65535, or a range.', 'أدخل منفذًا من 1 إلى 65535 أو نطاقًا.') }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::field x-model="ff.sourceInvalid">
                    <x-nq::field.label>{{ $t::t('Source', 'المصدر') }}</x-nq::field.label>
                    <x-nq::field.input x-model="ff.source" x-on:input="onFirewallInput()" ltr placeholder="any" autocomplete="off" />
                    <x-nq::field.description>{{ $t::t('An IP address, a block like 10.0.0.0/24, or any.', 'عنوان IP أو نطاق مثل 10.0.0.0/24 أو any.') }}</x-nq::field.description>
                    <x-nq::field.error>{{ $t::t('Enter an IP address, a block like 10.0.0.0/24, or any.', 'أدخل عنوان IP أو نطاقًا مثل 10.0.0.0/24 أو any.') }}</x-nq::field.error>
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('Note', 'ملاحظة') }}</x-nq::field.label>
                    <x-nq::field.input x-model="ff.note" dir="auto" maxlength="80" autocomplete="off" />
                </x-nq::field>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="fw.open = false">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary">{{ $t::t('Save to staged', 'حفظ في المرحلي') }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    @if ($hasHttp)
        <x-nq::dialog x-model="ht.open">
            <x-nq::dialog.content>
                <form novalidate data-slot="network-rule-dialog" class="grid gap-4" x-on:submit.prevent="saveHttp()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="htTitle"></span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t::t('Saved to the staged list. It only takes effect when you apply.', 'تُحفظ في القائمة المرحلية ولا تسري إلا عند التطبيق.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t::t('Rule type', 'نوع القاعدة') }}</x-nq::field.label>
                        <x-nq::select value="redirect" x-model="hf.type">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($httpTypes as $k => $label)
                                    <x-nq::select.item :value="$k">{{ $label }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                    <x-nq::field x-model="hf.invalid.path">
                        <x-nq::field.label>{{ $t::t('Path', 'المسار') }}</x-nq::field.label>
                        <x-nq::field.input x-model="hf.path" x-on:input="onHttpInput()" ltr autocomplete="off" />
                        <x-nq::field.description>{{ $t::t('Starts with a slash. Use / for the whole site.', 'يبدأ بشرطة مائلة. استخدم / للموقع كله.') }}</x-nq::field.description>
                        <x-nq::field.error>{{ $t::t('Start with a slash and use no spaces.', 'ابدأ بشرطة مائلة ولا تستخدم مسافات.') }}</x-nq::field.error>
                    </x-nq::field>
                    <template x-if="hfIsRedirect">
                        <div class="grid gap-4">
                            <x-nq::field x-model="hf.invalid.target">
                                <x-nq::field.label>{{ $t::t('Redirect to', 'إعادة التوجيه إلى') }}</x-nq::field.label>
                                <x-nq::field.input x-model="hf.target" x-on:input="onHttpInput()" ltr placeholder="https://example.com/new" autocomplete="off" />
                                <x-nq::field.error>{{ $t::t('Enter a full URL or a path.', 'أدخل رابطًا كاملًا أو مسارًا.') }}</x-nq::field.error>
                            </x-nq::field>
                            <x-nq::field>
                                <x-nq::field.label>{{ $t::t('Status code', 'رمز الحالة') }}</x-nq::field.label>
                                <x-nq::select value="301" x-model="hf.status">
                                    <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                    <x-nq::select.content>
                                        @foreach ($statusLabels as $k => $label)
                                            <x-nq::select.item :value="(string) $k">{{ $label }}</x-nq::select.item>
                                        @endforeach
                                    </x-nq::select.content>
                                </x-nq::select>
                            </x-nq::field>
                        </div>
                    </template>
                    <template x-if="hfIsHeader">
                        <div class="grid gap-4 sm:grid-cols-2">
                            <x-nq::field x-model="hf.invalid.name">
                                <x-nq::field.label>{{ $t::t('Header name', 'اسم الرأس') }}</x-nq::field.label>
                                <x-nq::field.input x-model="hf.name" x-on:input="onHttpInput()" ltr placeholder="X-Frame-Options" autocomplete="off" />
                                <x-nq::field.error>{{ $t::t('Use letters, digits and dashes.', 'استخدم أحرفًا وأرقامًا وشرطات.') }}</x-nq::field.error>
                            </x-nq::field>
                            <x-nq::field x-model="hf.invalid.value">
                                <x-nq::field.label>{{ $t::t('Header value', 'قيمة الرأس') }}</x-nq::field.label>
                                <x-nq::field.input x-model="hf.value" x-on:input="onHttpInput()" ltr placeholder="DENY" autocomplete="off" />
                                <x-nq::field.error>{{ $t::t('Enter a value.', 'أدخل قيمة.') }}</x-nq::field.error>
                            </x-nq::field>
                        </div>
                    </template>
                    <template x-if="hfIsAuth">
                        <div class="grid gap-4 sm:grid-cols-2">
                            <x-nq::field x-model="hf.invalid.username">
                                <x-nq::field.label>{{ $t::t('Username', 'اسم المستخدم') }}</x-nq::field.label>
                                <x-nq::field.input x-model="hf.username" x-on:input="onHttpInput()" ltr autocomplete="off" />
                                <x-nq::field.error>{{ $t::t('Enter a username.', 'أدخل اسم مستخدم.') }}</x-nq::field.error>
                            </x-nq::field>
                            <x-nq::field x-model="hf.invalid.password">
                                <x-nq::field.label>{{ $t::t('Password', 'كلمة المرور') }}</x-nq::field.label>
                                <x-nq::field.input x-model="hf.password" x-on:input="onHttpInput()" ltr type="password" autocomplete="new-password" />
                                <x-nq::field.description>
                                    <span x-show="!ht.editingId" style="display: none">{{ $t::t('At least 8 characters. Never shown again.', '8 أحرف على الأقل. لا تُعرض مرة أخرى.') }}</span>
                                    <span x-show="ht.editingId" style="display: none">{{ $t::t('Leave empty to keep the current password.', 'اتركها فارغة للإبقاء على الحالية.') }}</span>
                                </x-nq::field.description>
                                <x-nq::field.error>{{ $t::t('Use at least 8 characters.', 'استخدم 8 أحرف على الأقل.') }}</x-nq::field.error>
                            </x-nq::field>
                        </div>
                    </template>
                    <template x-if="hfIsIp">
                        <x-nq::field x-model="hf.invalid.cidr">
                            <x-nq::field.label>{{ $t::t('IP address or block', 'عنوان IP أو نطاق') }}</x-nq::field.label>
                            <x-nq::field.input x-model="hf.cidr" x-on:input="onHttpInput()" ltr placeholder="203.0.113.0/24" autocomplete="off" />
                            <x-nq::field.error>{{ $t::t('Enter an IP address or a block like 10.0.0.0/24.', 'أدخل عنوان IP أو نطاقًا مثل 10.0.0.0/24.') }}</x-nq::field.error>
                        </x-nq::field>
                    </template>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="ht.open = false">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary">{{ $t::t('Save to staged', 'حفظ في المرحلي') }}</x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>

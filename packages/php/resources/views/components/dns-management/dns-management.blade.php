{{-- <x-nq::dns-management zone="example.com" :records="$records" @save="$event.detail.wait(…)" @delete="$event.detail.wait(…)" @toggle-proxy="$event.detail.wait(…)" />
     Manage the DNS records of a zone: a searchable table (type filter, pagination), an add / edit form in a dialog with validation per record type,
     a proxy switch and a delete confirm. zone: the domain; names show relative to it. records: [['id', 'type', 'name', 'content', 'ttl' => seconds (1 is Auto), 'proxied', 'priority', 'comment']].
     types: the types offered in the form (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA). ttl-options: seconds, 1 is Auto (default Auto, 1 min, 5 min, 15 min, 1 h, 4 h, 1 day).
     proxy: false hides the proxy column and switch. deletable (true): show Delete in the row menu.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       save          detail.input = { id?, type, name, content, ttl, proxied, priority?, comment? }; resolve, or resolve { error } (a new record may resolve { id })
       delete        detail.id; resolve, or resolve { error }
       toggle-proxy  detail.id, detail.proxied; resolve, or resolve { error }
     After success the card updates its own list. A rejected promise shows a generic error.
     Differences from the React component: the name column is not monospaced, an MX/SRV priority is part of the content text (no badge), the proxy switch shows on every
     row (it refuses non-proxiable types with a message), and the TTL list in the form is the one from ttl-options.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['zone', 'records' => [], 'types' => ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'], 'ttlOptions' => [1, 60, 300, 900, 3600, 14400, 86400], 'proxy' => true, 'deletable' => true])
@php
    $t = \Nasaq\Nasaq::class;
    $uid = 'nq-dns-'.\Illuminate\Support\Str::random(6);
    $units = [
        'auto' => $t::t('Auto', 'تلقائي'), 'seconds' => $t::t('{n} sec', '{n} ثانية'), 'minutes' => $t::t('{n} min', '{n} دقيقة'),
        'hours' => $t::t('{n} hours', '{n} ساعات'), 'hour' => $t::t('1 hour', 'ساعة'), 'hours2' => $t::t('2 hours', 'ساعتان'),
        'days' => $t::t('{n} days', '{n} أيام'), 'day' => $t::t('1 day', 'يوم'), 'days2' => $t::t('2 days', 'يومان'),
    ];
    $ttlLabel = function ($n) use ($units) {
        $fill = fn ($s, $v) => str_replace('{n}', (string) $v, $s);
        if ($n == 1) return $units['auto'];
        if ($n % 86400 === 0) { $d = intdiv($n, 86400); return $d === 1 ? $units['day'] : ($d === 2 ? $units['days2'] : $fill($units['days'], $d)); }
        if ($n % 3600 === 0) { $h = intdiv($n, 3600); return $h === 1 ? $units['hour'] : ($h === 2 ? $units['hours2'] : $fill($units['hours'], $h)); }
        if ($n % 60 === 0) return $fill($units['minutes'], intdiv($n, 60));
        return $fill($units['seconds'], $n);
    };
    $errors = [
        'name' => $t::t('Use letters, digits, hyphens and dots, or @ for the root.', 'استخدم أحرفًا وأرقامًا وشرطات ونقاطًا، أو @ للجذر.'),
        'content' => $t::t('Enter the record content.', 'أدخل محتوى السجل.'),
        'ipv4' => $t::t('Enter a valid IPv4 address, like 203.0.113.10.', 'أدخل عنوان IPv4 صالحًا مثل 203.0.113.10.'),
        'ipv6' => $t::t('Enter a valid IPv6 address, like 2001:db8::1.', 'أدخل عنوان IPv6 صالحًا مثل 2001:db8::1.'),
        'hostname' => $t::t('Enter a valid host name, like target.example.com.', 'أدخل اسم مضيف صالحًا مثل target.example.com.'),
        'priority' => $t::t('Priority is a whole number from 0 to 65535.', 'الأولوية عدد صحيح من 0 إلى 65535.'),
        'ttl' => $t::t('TTL is Auto or between 30 seconds and 1 day.', 'TTL تلقائي أو بين 30 ثانية ويوم واحد.'),
        'cnameApex' => $t::t('A CNAME cannot sit at the root of the zone.', 'لا يمكن وضع CNAME في جذر النطاق.'),
        'conflict' => $t::t('A CNAME cannot share a name with another record.', 'لا يمكن أن يشترك CNAME في الاسم مع سجل آخر.'),
        'duplicate' => $t::t('An identical record already exists.', 'يوجد سجل مطابق بالفعل.'),
    ];
    $recs = collect($records)->map(fn ($r) => array_filter([
        'id' => (string) $r['id'], 'type' => $r['type'], 'name' => $r['name'], 'content' => $r['content'], 'ttl' => (int) $r['ttl'],
        'proxied' => ! empty($r['proxied']), 'priority' => $r['priority'] ?? null, 'comment' => $r['comment'] ?? null,
    ], fn ($v) => $v !== null))->values()->all();
    $config = [
        'zone' => $zone, 'records' => $recs, 'types' => array_values($types), 'ttlOptions' => array_values($ttlOptions), 'proxy' => (bool) $proxy,
        'labels' => [
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
            'onlyProxiable' => $t::t('Only A, AAAA and CNAME records can be proxied.', 'يمكن تمرير سجلات A وAAAA وCNAME فقط عبر الوكيل.'),
            'nameHint' => $t::t('Full name: {name}', 'الاسم الكامل: {name}'),
            'errors' => $errors, 'ttlUnits' => $units,
        ],
    ];
    $columns = array_values(array_filter([
        ['id' => 'type', 'header' => $t::t('Type', 'النوع'), 'type' => 'tag', 'sortable' => true, 'filter' => true, 'hideable' => false,
            'options' => array_map(fn ($ty) => ['value' => $ty, 'label' => $ty], array_values($types))],
        ['id' => 'name', 'header' => $t::t('Name', 'الاسم'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'content', 'header' => $t::t('Content', 'المحتوى'), 'searchable' => true],
        ['id' => 'ttl', 'header' => 'TTL'],
        $proxy ? ['id' => 'proxied', 'header' => $t::t('Proxy', 'الوكيل'), 'type' => 'boolean', 'edit' => 'switch'] : null,
    ]));
    $actions = array_values(array_filter([
        ['id' => 'edit', 'label' => $t::t('Edit', 'تعديل'), 'icon' => 'pencil'],
        $deletable ? ['id' => 'delete', 'label' => $t::t('Delete', 'حذف'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
    $rows = collect($recs)->map(function ($r) use ($zone, $ttlLabel) {
        $n = strtolower(rtrim(trim($r['name']), '.')); $z = strtolower($zone);
        $rel = ($n === '' || $n === '@' || $n === $z) ? '@' : (str_ends_with($n, '.'.$z) ? substr($n, 0, -(strlen($z) + 1)) : $n);
        return [
            'id' => $r['id'], 'label' => $r['type'].' '.$rel, 'type' => $r['type'], 'name' => $rel,
            'content' => (isset($r['priority']) && in_array($r['type'], ['MX', 'SRV'], true) ? $r['priority'].' ' : '').$r['content'],
            'ttl' => $ttlLabel($r['ttl']), 'proxied' => (bool) ($r['proxied'] ?? false),
        ];
    })->all();
@endphp
{{-- The card's classes, copied from card.blade.php, so data-slot can be dns-management. --}}
<div data-slot="{{ $attributes->get('data-slot', 'dns-management') }}" x-data="nqDnsManagement(@js($config))"
    x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-edit="onEdit($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full max-w-5xl') }}>
    <x-nq::card.header class="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div class="flex flex-col gap-1.5">
            <x-nq::card.title as="h2">{{ $t::t('DNS records', 'سجلات DNS') }}</x-nq::card.title>
            <x-nq::card.description>{{ $t::t("Records for {$zone}. Changes can take a few minutes to reach everyone.", "سجلات {$zone}. قد يستغرق وصول التغييرات إلى الجميع بضع دقائق.") }}</x-nq::card.description>
        </div>
        <x-nq::button type="button" variant="primary" class="mt-3 sm:mt-0" x-on:click="openAdd()">
            <x-lucide-plus aria-hidden="true" />
            {{ $t::t('Add record', 'إضافة سجل') }}
        </x-nq::button>
    </x-nq::card.header>
    <x-nq::card.content class="flex flex-col gap-3">
        <template x-if="pageError">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="pageError = null"><span x-text="pageError"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$t::t('DNS records', 'سجلات DNS')" name-key="label" :search="$t::t('Search records', 'ابحث في السجلات')" :view-options="false" :page-size="10"
            :columns="$columns" :rows="$rows" :row-actions="$actions"
            :labels="['empty' => $t::t('No DNS records yet', 'لا توجد سجلات DNS بعد')]" />
    </x-nq::card.content>

    <x-nq::dialog x-model="formOpen">
        <x-nq::dialog.content>
            <form novalidate data-slot="dns-record-form" class="grid gap-4" x-on:submit.prevent="submit()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="editingId ? @js($t::t('Edit DNS record', 'تعديل سجل DNS')) : @js($t::t('Add a DNS record', 'إضافة سجل DNS'))"></span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t::t('Names are relative to the zone. Use @ for the root.', 'الأسماء نسبية إلى النطاق. استخدم @ للجذر.') }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <template x-if="formError"><x-nq::alert tone="danger"><span x-text="formError"></span></x-nq::alert></template>
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('Type', 'النوع') }}</x-nq::field.label>
                    <x-nq::select :value="$types[0] ?? 'A'" x-model="type">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($types as $ty)
                                <x-nq::select.item :value="$ty">{{ $ty }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <x-nq::field x-model="nameInvalid">
                    <x-nq::field.label>{{ $t::t('Name', 'الاسم') }}</x-nq::field.label>
                    <x-nq::field.input x-model="name" ltr placeholder="{{ $t::t('@ or www', '@ أو www') }}" autocomplete="off" />
                    <x-nq::field.description><span x-text="fullName"></span></x-nq::field.description>
                    <x-nq::field.error><span x-text="errors.name"></span></x-nq::field.error>
                </x-nq::field>
                <x-nq::field x-model="contentInvalid">
                    <x-nq::field.label>{{ $t::t('Content', 'المحتوى') }}</x-nq::field.label>
                    <x-nq::field.input x-model="content" ltr autocomplete="off" x-bind:placeholder="placeholder" />
                    <x-nq::field.error><span x-text="errors.content"></span></x-nq::field.error>
                </x-nq::field>
                <div x-show="showPriority" style="display: none">
                    <x-nq::field x-model="priorityInvalid">
                        <x-nq::field.label>{{ $t::t('Priority', 'الأولوية') }}</x-nq::field.label>
                        <x-nq::field.input x-model="priority" ltr type="number" inputmode="numeric" min="0" max="65535" />
                        <x-nq::field.error><span x-text="errors.priority"></span></x-nq::field.error>
                    </x-nq::field>
                </div>
                <x-nq::field>
                    <x-nq::field.label>TTL</x-nq::field.label>
                    <x-nq::select value="1" x-model="ttl">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($ttlOptions as $v)
                                <x-nq::select.item :value="(string) $v">{{ $ttlLabel($v) }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                @if ($proxy)
                    <div x-show="canProxy" style="display: none" class="flex items-start justify-between gap-4 rounded-control border border-border p-3">
                        <div class="grid gap-0.5">
                            <span id="{{ $uid }}-proxy" class="text-label text-foreground">{{ $t::t('Proxy through the network', 'المرور عبر الشبكة') }}</span>
                            <span class="text-caption text-muted-foreground">{{ $t::t('Hides the origin address and adds caching and protection. Only for A, AAAA and CNAME.', 'يخفي عنوان الخادم الأصلي ويضيف التخزين المؤقت والحماية. لسجلات A وAAAA وCNAME فقط.') }}</span>
                        </div>
                        <x-nq::switch x-model="proxied" aria-labelledby="{{ $uid }}-proxy" />
                    </div>
                @endif
                <x-nq::field>
                    <x-nq::field.label>{{ $t::t('Comment', 'تعليق') }}</x-nq::field.label>
                    <x-nq::field.input x-model="comment" placeholder="{{ $t::t('What this record is for', 'الغرض من هذا السجل') }}" maxlength="100" autocomplete="off" />
                </x-nq::field>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="formOpen = false" x-bind:disabled="pending ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="pending ? 'true' : null" x-bind:data-disabled="pending ? '' : null">
                        <x-nq::spinner x-show="pending" style="display: none" />
                        <span x-text="editingId ? @js($t::t('Save record', 'حفظ السجل')) : @js($t::t('Add record', 'إضافة السجل'))"></span>
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::alert-dialog x-model="deleteOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="deleting ? @js($t::t('Delete', 'حذف')) + ' ' + deleting.type + ' ' + deleting.name + '?' : ''"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>{{ $t::t('Anything that relies on this record stops resolving once the change spreads. This cannot be undone.', 'أي شيء يعتمد على هذا السجل يتوقف عن العمل بعد انتشار التغيير. لا يمكن التراجع.') }}</x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel>{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                <x-nq::alert-dialog.action variant="danger" x-on:click="confirmDelete()">{{ $t::t('Delete record', 'حذف السجل') }}</x-nq::alert-dialog.action>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>

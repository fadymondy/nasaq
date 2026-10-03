{{-- <x-nq::domains-manager :domains="$domains" cname-target="edge.example.com" @add="$event.detail.wait(…)" @remove="$event.detail.wait(…)" @recheck="$event.detail.wait(…)" @make-primary="$event.detail.wait(…)" />
     Custom domains for a site: add a domain, see whether its DNS check passed, check again, make one primary, remove one (with a confirm), with the CNAME target to copy.
     domains: [['id', 'host', 'check' => verified | pending | checking | failed, 'primary' => false, 'addedAt' => DateTime | ISO string | unix seconds, 'error']].
     cname-target: the CNAME people point their domain at, shown with a copy button. make-primary (true): show Make primary in the row menu.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       add           detail.host (already normalised); resolve, or resolve { error } shown under the field; a new domain may resolve { id }
       remove        detail.id (after the confirm); resolve, or resolve { error }
       recheck       detail.id; resolve { check } with the new state, or resolve { error }
       make-primary  detail.id; resolve, or resolve { error }
     After success the card updates its own list. A rejected promise shows a generic error.
     Differences from the React component: the Primary badge sits in its own column, the failure reason is not shown under the status, and the row menu does not
     disable Check again while checking or Make primary on unverified domains. The "Added" column shows a date, not a relative time.
     Compact chips for a table cell: <x-nq::domains-manager.chips :domains="$domains" />.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['domains' => [], 'cnameTarget' => null, 'makePrimary' => true])
@php
    $t = \Nasaq\Nasaq::class;
    $date = function ($v) {
        if ($v === null || $v === '') return null;
        $c = $v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v));
        return $c->format('Y-m-d');
    };
    $list = collect($domains)->map(fn ($d) => array_filter([
        'id' => (string) $d['id'], 'host' => $d['host'], 'check' => $d['check'] ?? 'pending', 'primary' => ! empty($d['primary']),
        'addedAt' => $date($d['addedAt'] ?? null) ?: null, 'error' => $d['error'] ?? null,
    ], fn ($v) => $v !== null))->values()->all();
    $checks = [
        'verified' => $t::t('Verified', 'موثّق'), 'pending' => $t::t('Waiting for DNS', 'بانتظار DNS'),
        'checking' => $t::t('Checking', 'قيد الفحص'), 'failed' => $t::t('Check failed', 'فشل الفحص'),
    ];
    $tones = ['verified' => 'success', 'pending' => 'warning', 'checking' => 'info', 'failed' => 'danger'];
    $config = [
        'domains' => $list,
        'labels' => [
            'invalid' => $t::t('Enter a full domain name like shop.example.com.', 'أدخل اسم نطاق كاملًا مثل shop.example.com.'),
            'duplicate' => $t::t('This domain is already added.', 'هذا النطاق مضاف بالفعل.'),
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
            'summary' => $t::t('{verified} of {total} verified', '{verified} من {total} موثّق'),
            'removeTitle' => $t::t('Remove {host}?', 'إزالة {host}؟'),
        ],
    ];
    $columns = [
        ['id' => 'host', 'header' => $t::t('Domain', 'النطاق'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'primary', 'header' => '', 'type' => 'tag', 'hideable' => false, 'options' => [['value' => 'primary', 'label' => $t::t('Primary', 'أساسي'), 'hue' => 'blue']]],
        ['id' => 'check', 'header' => $t::t('Status', 'الحالة'), 'type' => 'status', 'sortable' => true,
            'options' => array_map(fn ($k) => ['value' => $k, 'label' => $checks[$k], 'tone' => $tones[$k]], array_keys($checks))],
        ['id' => 'added', 'header' => $t::t('Added', 'أضيف'), 'type' => 'date', 'sortable' => true],
    ];
    $actions = array_values(array_filter([
        ['id' => 'recheck', 'label' => $t::t('Check again', 'فحص مجددًا'), 'icon' => 'refresh-cw', 'group' => 'check'],
        $makePrimary ? ['id' => 'primary', 'label' => $t::t('Make primary', 'تعيين كأساسي'), 'icon' => 'star', 'group' => 'check'] : null,
        ['id' => 'remove', 'label' => $t::t('Remove', 'إزالة'), 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'],
    ]));
    $rows = collect($list)->map(fn ($d) => [
        'id' => $d['id'], 'host' => $d['host'], 'check' => $d['check'], 'primary' => ! empty($d['primary']) ? 'primary' : '', 'added' => $d['addedAt'] ?? null,
    ])->all();
@endphp
{{-- The card's classes, copied from card.blade.php, so data-slot can be domains-manager. --}}
<div data-slot="{{ $attributes->get('data-slot', 'domains-manager') }}" x-data="nqDomainsManager(@js($config))"
    x-on:nq-data-table-action="onAction($event)"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
    <x-nq::card.header>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::card.title as="h3">{{ $t::t('Custom domains', 'النطاقات المخصصة') }}</x-nq::card.title>
            <x-nq::badge variant="success" x-show="summaryText !== '' && allVerified" style="display: none"><span x-text="summaryText"></span></x-nq::badge>
            <x-nq::badge variant="warning" x-show="summaryText !== '' && ! allVerified" style="display: none"><span x-text="summaryText"></span></x-nq::badge>
        </div>
        <x-nq::card.description>{{ $t::t('Serve this site from your own domain names.', 'اخدم هذا الموقع من أسماء نطاقاتك الخاصة.') }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="grid gap-4">
        <form novalidate class="flex flex-wrap items-start gap-2" data-slot="domains-add" x-on:submit.prevent="submit()">
            <x-nq::field x-model="fieldInvalid" class="min-w-56 flex-1">
                <x-nq::field.label class="sr-only">{{ $t::t('Domain name', 'اسم النطاق') }}</x-nq::field.label>
                <x-nq::field.input x-model="value" x-on:input="onInput()" ltr placeholder="shop.example.com" autocomplete="off" aria-label="{{ $t::t('Domain name', 'اسم النطاق') }}" />
                <x-nq::field.error><span x-text="error"></span></x-nq::field.error>
                <p x-show="! fieldInvalid" class="mt-1 text-caption text-muted-foreground">{{ $t::t('For example shop.example.com', 'مثال: shop.example.com') }}</p>
            </x-nq::field>
            <x-nq::button type="submit" variant="primary" x-bind:aria-busy="adding ? 'true' : null" x-bind:data-disabled="adding ? '' : null">
                <x-nq::spinner x-show="adding" style="display: none" />
                <x-lucide-plus aria-hidden="true" x-show="! adding" />
                {{ $t::t('Add domain', 'إضافة نطاق') }}
            </x-nq::button>
        </form>
        @if ($cnameTarget)
            <div data-slot="domains-setup" class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border bg-secondary/40 px-3 py-2 text-body-sm">
                <span class="min-w-0 flex-1">
                    <span class="text-label text-foreground">{{ $t::t('Point the domain at us', 'وجّه النطاق إلينا') }}. </span>
                    <span class="text-muted-foreground">{{ $t::t('At your DNS provider, add a CNAME record for the domain that points to', 'لدى مزوّد DNS أضف سجل CNAME للنطاق يشير إلى') }}</span>
                </span>
                <span class="inline-flex items-center gap-1">
                    <bdi dir="ltr" class="font-mono text-body-sm">{{ $cnameTarget }}</bdi>
                    <x-nq::copy-button :value="$cnameTarget" size="icon-sm" variant="ghost" :label="$t::t('Copy the CNAME target', 'نسخ هدف CNAME')" />
                </span>
            </div>
        @endif
        <template x-if="notice">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
        </template>
        <x-nq::data-table x-model="tableRows" :label="$t::t('Custom domains', 'النطاقات المخصصة')" name-key="host" :search="false" :view-options="false"
            :columns="$columns" :rows="$rows" :row-actions="$actions"
            :labels="['empty' => $t::t('No custom domains yet. Add one to get started.', 'لا توجد نطاقات مخصصة بعد. أضف نطاقًا للبدء.')]" />
    </x-nq::card.content>

    <x-nq::alert-dialog x-model="removeOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="removeTitle"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>{{ $t::t('The site stops answering on this domain. The DNS records at your registrar are not touched.', 'يتوقف الموقع عن الاستجابة على هذا النطاق. لا تتأثر سجلات DNS لدى مسجّل النطاق.') }}</x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel>{{ $t::t('Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                <x-nq::alert-dialog.action variant="danger" x-on:click="confirmRemove()">{{ $t::t('Remove', 'إزالة') }}</x-nq::alert-dialog.action>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>

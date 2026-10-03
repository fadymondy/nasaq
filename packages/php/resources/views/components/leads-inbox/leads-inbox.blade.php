{{-- <x-nq::leads-inbox :leads="$leads" :canned="$canned" @lead-status="$event.detail.wait(…)" @lead-convert="…" @lead-reply="…" />
     Inquiries from your forms with where each came from (UTM, referrer, Google click id), a stage pipeline with counts, a detail panel with reply and canned replies, and conversion into a CRM contact.
     The list is an x-nq::entity-list: a table or a grid of cards (the layout toggle), and every row's actions also open as a context menu. Needs the Alpine runtime (@nasaqScripts).
     leads: [['id', 'name', 'email', 'phone', 'company', 'message', 'budget' => '$12,000', 'status' => new | contacted | qualified | converted | spam, 'receivedAt' => ISO string | epoch ms | DateTime, 'form',
       'attribution' => ['utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent', 'referrer', 'gclid', 'landingPage'], 'score' => 82 | ['score' => 82, 'max' => 100, 'dimensions' => [...], 'summary', 'confidence', 'model', 'aiGenerated'] (a model's rating; the badge in the table opens the score explainer, as x-nq::score-explainer.badge),
       'contact' / 'companyRef' / 'deal' => ['id', 'name'] (set once converted)]].
     canned: [['id', 'shortcut', 'title', 'body' => 'Hi {{name}}, …']] for the bolt menu of the reply box ({{name}} is the lead's first name).
     can-status: false hides the stage moves and spam. can-convert: false hides convert. can-reply: false hides the composer. open-id: start with this lead's panel open.
     label: the list's accessible name. labels: override any string, e.g. ['convert' => 'Create contact']. page-size passes to the list. view: table | cards (the start layout). context-menu is kept for compatibility (the list always has its context menu).
     It is presentational: it fires events on the root with detail { …, wait(promise) }; your handler talks to the server. Resolve, or resolve { error } shown in the panel or dialog.
       lead-status   { id, lead, status }                                       resolve { error? }   (status is never "converted")
       lead-convert  { id, lead, conversion: { contactName, company?, deal? } } resolve { error? }
       lead-reply    { id, lead, message }                                      resolve { error? }
     After a success the lead is updated in the page. A rejected promise, or nobody listening, shows a generic error.
     The layout toggle fires nq-entity-list-view { view } on the root. --}}
@props(['leads' => [], 'canned' => [], 'canStatus' => true, 'canConvert' => true, 'canReply' => true, 'openId' => null, 'label' => null, 'labels' => [], 'pageSize' => 0, 'contextMenu' => true, 'view' => 'table'])
@include('nasaq::components.score-explainer._logic')
@php
    $t = \Nasaq\Nasaq::class;
    $loc = $t::rtl() ? 'ar' : 'en';
    $L = array_merge([
        'label' => $t::t('Leads', 'العملاء المحتملون'), 'search' => $t::t('Search leads…', 'ابحث في العملاء المحتملين…'), 'all' => $t::t('All', 'الكل'),
        'pipeline' => $t::t('Pipeline', 'المراحل'), 'lead' => $t::t('Lead', 'العميل المحتمل'), 'source' => $t::t('Source', 'المصدر'), 'stage' => $t::t('Stage', 'المرحلة'),
        'score' => $t::t('Score', 'التقييم'), 'received' => $t::t('Received', 'وصل'), 'budget' => $t::t('Budget', 'الميزانية'), 'direct' => $t::t('Direct visit', 'زيارة مباشرة'),
        'moveTo' => $t::t('Move to {stage}', 'نقل إلى {stage}'), 'markSpam' => $t::t('Mark as spam', 'تعليم كمزعج'), 'notSpam' => $t::t('Not spam', 'ليس مزعجًا'),
        'convert' => $t::t('Convert to CRM', 'تحويل إلى العملاء'), 'reply' => $t::t('Reply', 'رد'), 'open' => $t::t('Open', 'فتح'), 'message' => $t::t('Message', 'الرسالة'),
        'attribution' => $t::t('Where it came from', 'من أين جاء'), 'attributionHint' => $t::t("What the visitor's browser reported when they sent the form.", 'ما أبلغ عنه متصفح الزائر عند إرسال النموذج.'),
        'copy' => $t::t('Copy', 'نسخ'), 'form' => $t::t('Form', 'النموذج'), 'email' => $t::t('Email', 'البريد'), 'phone' => $t::t('Phone', 'الهاتف'),
        'converted' => $t::t('Converted to CRM', 'تم التحويل إلى العملاء'), 'contactRef' => $t::t('Contact', 'جهة الاتصال'), 'companyRef' => $t::t('Company', 'الشركة'), 'dealRef' => $t::t('Deal', 'الصفقة'),
        'convertHint' => $t::t('Creates a contact from this lead. The lead stays here, marked as converted.', 'ينشئ جهة اتصال من هذا الطلب. يبقى الطلب هنا وعليه علامة محوَّل.'),
        'contactName' => $t::t('Contact name', 'اسم جهة الاتصال'), 'companyName' => $t::t('Company', 'الشركة'), 'createCompany' => $t::t('Create a company', 'إنشاء شركة'),
        'createDeal' => $t::t('Open a deal', 'فتح صفقة'), 'dealTitle' => $t::t('Deal title', 'عنوان الصفقة'), 'convertAction' => $t::t('Convert', 'تحويل'), 'cancel' => $t::t('Cancel', 'إلغاء'),
        'replyLabel' => $t::t('Your reply', 'ردك'), 'replyPlaceholder' => $t::t('Write a reply, or press the bolt for a canned reply…', 'اكتب ردًا، أو اضغط على البرق لرد جاهز…'),
        'cannedTrigger' => $t::t('Canned replies', 'الردود الجاهزة'), 'cannedSearch' => $t::t('Search replies…', 'ابحث في الردود…'), 'cannedEmpty' => $t::t('No matching replies', 'لا توجد ردود مطابقة'),
        'send' => $t::t('Send reply', 'إرسال الرد'), 'sent' => $t::t('Reply sent', 'تم إرسال الرد'), 'failed' => $t::t('That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
        'empty' => $t::t('No leads yet', 'لا يوجد عملاء محتملون بعد'), 'emptyHint' => $t::t('Inquiries from your forms land here, with where they came from.', 'تصل هنا استفسارات نماذجك، مع مصدر كل واحد.'),
    ], array_diff_key((array) $labels, array_flip(['statuses', 'sources', 'attrKeys', 'bands'])));
    $L['statuses'] = array_merge(['new' => $t::t('New', 'جديد'), 'contacted' => $t::t('Contacted', 'تم التواصل'), 'qualified' => $t::t('Qualified', 'مؤهَّل'), 'converted' => $t::t('Converted', 'محوَّل'), 'spam' => $t::t('Spam', 'مزعج')], (array) ($labels['statuses'] ?? []));
    $L['sources'] = array_merge(['paid' => $t::t('Paid', 'مدفوع'), 'organic' => $t::t('Organic', 'عضوي'), 'social' => $t::t('Social', 'اجتماعي'), 'email' => $t::t('Email', 'بريد'), 'referral' => $t::t('Referral', 'إحالة'), 'direct' => $t::t('Direct', 'مباشر')], (array) ($labels['sources'] ?? []));
    $L['attrKeys'] = array_merge([
        'utmSource' => $t::t('UTM source', 'مصدر UTM'), 'utmMedium' => $t::t('UTM medium', 'وسيط UTM'), 'utmCampaign' => $t::t('UTM campaign', 'حملة UTM'), 'utmTerm' => $t::t('UTM term', 'كلمة UTM'),
        'utmContent' => $t::t('UTM content', 'محتوى UTM'), 'referrer' => $t::t('Referrer', 'الموقع المُحيل'), 'gclid' => $t::t('Google click ID', 'معرّف نقرة جوجل'), 'landingPage' => $t::t('Landing page', 'صفحة الوصول'),
    ], (array) ($labels['attrKeys'] ?? []));
    $words = nq_score_words((array) ($labels['score'] ?? []));
    $can = ['status' => (bool) $canStatus, 'convert' => (bool) $canConvert, 'reply' => (bool) $canReply];
    $uid = 'nq-leads-'.\Illuminate\Support\Str::random(6);

    $when = fn ($v) => $v instanceof \DateTimeInterface ? $v->format(DATE_ATOM) : (is_numeric($v) ? gmdate('Y-m-d\TH:i:s\Z', (int) ($v / 1000)) : (string) $v);
    $rating = function ($s) {
        if ($s === null) {
            return null;
        }
        $score = is_array($s) ? (float) ($s['score'] ?? 0) : (float) $s;
        $max = is_array($s) ? (float) ($s['max'] ?? 100) : 100.0;

        return $max > 0 ? round($score / $max * 100, 1) : null;
    };
    $scoreProps = collect($leads)->mapWithKeys(function ($l) {
        $l = (array) $l;
        $sc = $l['score'] ?? null;
        if ($sc === null) {
            return [];
        }
        $sc = is_array($sc) ? $sc : ['score' => $sc];

        return [(string) $l['id'] => [
            'score' => (float) ($sc['score'] ?? 0), 'max' => (float) ($sc['max'] ?? 100), 'dimensions' => (array) ($sc['dimensions'] ?? []), 'summary' => $sc['summary'] ?? null,
            'confidence' => $sc['confidence'] ?? null, 'model' => $sc['model'] ?? null, 'aiGenerated' => (bool) ($sc['aiGenerated'] ?? false),
        ]];
    })->all();
    $items = collect($leads)->map(function ($l) use ($when, $rating) {
        $l = (array) $l;
        $out = [];
        foreach (['id', 'name', 'email', 'phone', 'company', 'message', 'budget', 'form'] as $k) {
            if (isset($l[$k]) && $l[$k] !== '') {
                $out[$k] = (string) $l[$k];
            }
        }
        $out['status'] = (string) ($l['status'] ?? 'new');
        $out['receivedAt'] = $when($l['receivedAt'] ?? '');
        if (! empty($l['attribution'])) {
            $out['attribution'] = array_filter((array) $l['attribution'], fn ($v) => $v !== null && $v !== '');
        }
        if (($r = $rating($l['score'] ?? null)) !== null) {
            $out['score'] = $r;
        }
        foreach (['contact', 'companyRef', 'deal'] as $k) {
            if (! empty($l[$k])) {
                $out[$k] = ['id' => (string) ($l[$k]['id'] ?? ''), 'name' => (string) ($l[$k]['name'] ?? '')];
            }
        }

        return $out;
    })->values()->all();
    $snippets = collect($canned)->map(fn ($c) => ['id' => (string) $c['id'], 'shortcut' => (string) $c['shortcut'], 'title' => (string) $c['title'], 'body' => (string) $c['body']])->values()->all();
    $config = [
        'leads' => $items, 'canned' => $snippets, 'can' => $can, 'locale' => $loc, 'openId' => $openId,
        'labels' => [
            'statuses' => $L['statuses'], 'sources' => $L['sources'], 'attrKeys' => $L['attrKeys'], 'bands' => $words['bands'], 'moveTo' => $L['moveTo'],
            'markSpam' => $L['markSpam'], 'notSpam' => $L['notSpam'], 'failed' => $L['failed'], 'sent' => $L['sent'],
        ],
    ];
    $moveLabel = fn (string $s) => str_replace('{stage}', $L['statuses'][$s], $L['moveTo']);
    $actions = array_values(array_filter([
        ['id' => 'open', 'label' => $L['open'], 'icon' => 'inbox'],
        $canConvert ? ['id' => 'convert', 'label' => $L['convert'], 'icon' => 'user-plus'] : null,
        ...($canStatus ? [
            ['id' => 'move-new', 'label' => $moveLabel('new'), 'icon' => 'arrow-right', 'group' => 'stage'],
            ['id' => 'move-contacted', 'label' => $moveLabel('contacted'), 'icon' => 'arrow-right', 'group' => 'stage'],
            ['id' => 'move-qualified', 'label' => $moveLabel('qualified'), 'icon' => 'arrow-right', 'group' => 'stage'],
            ['id' => 'spam', 'label' => $L['markSpam'], 'icon' => 'ban', 'danger' => true, 'group' => 'danger'],
            ['id' => 'unspam', 'label' => $L['notSpam'], 'icon' => 'ban', 'group' => 'danger'],
        ] : []),
    ]));
    $columns = [
        ['id' => 'lead', 'key' => 'name', 'header' => $L['lead'], 'type' => 'avatar', 'secondary' => 'secondary', 'sortable' => true, 'searchable' => true, 'searchKey' => 'searchText', 'hideable' => false],
        ['id' => 'source', 'key' => 'sourceKind', 'header' => $L['source'], 'sortable' => true],
        ['id' => 'stage', 'key' => 'stage', 'header' => $L['stage'], 'sortable' => true, 'sortKey' => 'stageOrder'],
        ['id' => 'score', 'key' => 'scoreText', 'header' => $L['score'], 'sortable' => true, 'sortKey' => 'scoreN', 'align' => 'end'],
        ['id' => 'received', 'key' => 'receivedAt', 'header' => $L['received'], 'type' => 'datetime', 'format' => 'relative', 'sortable' => true, 'align' => 'end'],
    ];
    $tabs = ['all' => $L['all']] + $L['statuses'];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'leads-inbox') }}" x-data="nqLeadsInbox(@js($config))" x-on:nq-entity-list-action="onAction($event)" x-on:nq-entity-list-row-click="onRowClick($event)"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div role="group" aria-label="{{ $L['pipeline'] }}" class="flex flex-wrap gap-2">
        @foreach ($tabs as $key => $text)
            <template x-if="stage === '{{ $key }}'">
                <x-nq::button type="button" size="sm" variant="primary" aria-pressed="true" data-stage="{{ $key }}" x-on:click="setStage('{{ $key }}')">{{ $text }} <span class="ms-1.5 tabular-nums opacity-80" x-text="countText('{{ $key }}')"></span></x-nq::button>
            </template>
            <template x-if="stage !== '{{ $key }}'">
                <x-nq::button type="button" size="sm" variant="secondary" aria-pressed="false" data-stage="{{ $key }}" x-on:click="setStage('{{ $key }}')">{{ $text }} <span class="ms-1.5 tabular-nums opacity-80" x-text="countText('{{ $key }}')"></span></x-nq::button>
            </template>
        @endforeach
    </div>
    <template x-if="failure"><x-nq::alert tone="danger" dismissible x-on:nq:dismiss="failure = ''"><span x-text="failure"></span></x-nq::alert></template>

    <x-nq::entity-list x-model="lead_rows.rows" :label="$label ?? $L['label']" :search="$L['search']" :columns="$columns" :rows="[]" :page-size="$pageSize" :row-actions="$actions" actions-key="actions" :selectable="false" :view="$view">
        <x-slot name="cell_source">@include('nasaq::components.leads-inbox._source', ['scope' => 'row'])</x-slot>
        <x-slot name="cell_stage">@include('nasaq::components.leads-inbox._status', ['field' => 'row.stage'])</x-slot>
        <x-slot name="cell_score">
            <span class="contents" x-show="row.scoreN < 0" style="display: none"><span>—</span></span>
            @foreach ($scoreProps as $sid => $sp)
                <span class="contents" x-show="row.id === '{{ addslashes((string) $sid) }}'" style="display: none"><x-nq::score-explainer.badge :score="$sp['score']" :max="$sp['max']" :dimensions="$sp['dimensions']" :summary="$sp['summary']" :confidence="$sp['confidence']" :model="$sp['model']" :ai-generated="$sp['aiGenerated']" :labels="(array) ($labels['score'] ?? [])" /></span>
            @endforeach
        </x-slot>
        <x-slot name="card">
            <div class="flex min-w-0 flex-col gap-2">
                <div class="flex items-start justify-between gap-2 pe-(--entity-card-controls)">
                    <div data-slot="entity-identity" class="flex min-w-0 items-center gap-3">
                        <span data-slot="avatar" class="relative inline-flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-secondary align-middle text-caption font-medium text-secondary-foreground">
                            <span data-slot="avatar-fallback" aria-hidden="true" class="flex size-full items-center justify-center" x-text="initials(row.name)"></span>
                        </span>
                        <div class="flex min-w-0 flex-col">
                            <span class="truncate text-label text-foreground" x-text="row.name"></span>
                            <span class="truncate text-body-sm text-muted-foreground" x-show="row.secondary" style="display: none" x-text="row.secondary"></span>
                        </div>
                    </div>
                    @include('nasaq::components.leads-inbox._status', ['field' => 'row.stage'])
                </div>
                <span dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground" x-show="row.message" style="display: none" x-text="row.message"></span>
                <x-nq::entity-list.card-meta :label="$L['source']">@include('nasaq::components.leads-inbox._source', ['scope' => 'row'])</x-nq::entity-list.card-meta>
                <x-nq::entity-list.card-meta :label="$L['received']"><time class="tabular-nums text-body-sm text-muted-foreground" x-bind:datetime="isoOf(row, col('received'))" x-bind:title="absoluteOf(row, col('received'))" x-text="shownText(row, col('received'))"></time></x-nq::entity-list.card-meta>
            </div>
        </x-slot>
        <x-slot:empty><x-nq::states.empty icon="inbox" :title="$L['empty']" :description="$L['emptyHint']" class="border-0" /></x-slot:empty>
    </x-nq::entity-list>

    @include('nasaq::components.leads-inbox._detail')
    @if ($can['convert'])
        @include('nasaq::components.leads-inbox._convert')
    @endif
</div>

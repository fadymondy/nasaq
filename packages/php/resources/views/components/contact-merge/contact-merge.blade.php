{{-- <x-nq::contact-merge :records="$records" @nq-merge="$event.detail.waitUntil(merge($event.detail))" cancellable @nq-cancel="history.back()" />
     Fold duplicate contacts into one. The user keeps one record as the survivor, and for every field where the records disagree picks whose value
     stays; lists (tags) are combined by default. A live "After the merge" panel shows the result, what moves over and the consent that survives
     (an opt-out always wins). Confirming asks once, then fires nq-merge.
     records: [['id', 'name', 'avatar', 'values' => [fieldId => string|string[]], 'createdAt', 'stats' => [['label', 'value']],
              'identities' => [['channel', 'value']], 'consent' => ['email' => 'granted'|'denied'|'unknown', ...]]]
     fields: [['id', 'label', 'multi', 'ltr']]. Default: name, email, phone, company, job title, owner and tags.
     default-survivor-id: the record that starts as the survivor (default the first). cancellable: shows Cancel, which fires nq-cancel.
     It stores nothing: it fires events on the root with detail.waitUntil(promise).
       nq-merge   detail { survivorId, mergedIds, values, choices, waitUntil }   resolve with { error: "…" } (or reject) to keep the dialog and show the message
       nq-cancel  detail {}
     labels: override any string; labels['fields'] and labels['channels'] override the field and channel names. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['records' => [], 'fields' => null, 'defaultSurvivorId' => null, 'cancellable' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = str_starts_with(app()->getLocale(), 'ar');
    $over = (array) $labels;
    $s = array_merge([
        'title' => $t::t('Merge duplicate contacts', 'دمج جهات الاتصال المكرّرة'),
        'description' => $t::t('Choose the record that stays, then pick which value survives wherever the records disagree.', 'اختر السجل الذي يبقى، ثم اختر القيمة التي تبقى في كل حقل تختلف فيه السجلات.'),
        'survivor' => $t::t('Keep this record', 'أبقِ هذا السجل'),
        'survivorHint' => $t::t('Its history stays. The others are folded into it and deleted.', 'يبقى سجله كما هو. تُدمج السجلات الأخرى فيه وتُحذف.'),
        'created' => $t::t('Created', 'أُنشئ'),
        'noneDiffer' => $t::t('Nothing to decide: the records do not disagree.', 'لا شيء لتحسمه: السجلات متطابقة.'),
        'combineAll' => $t::t('Combine all', 'دمج الكل'),
        'combined' => $t::t('Everything from every record', 'كل ما في كل السجلات'),
        'from' => $t::t('from', 'من'),
        'empty' => $t::t('Empty', 'فارغ'),
        'same' => $t::t('Same in every record', 'متطابق في كل السجلات'),
        'result' => $t::t('After the merge', 'بعد الدمج'),
        'resultHint' => $t::t('This is the contact that will exist.', 'هذه جهة الاتصال التي ستبقى.'),
        'moves' => $t::t('Moves over', 'ينتقل إليها'),
        'identities' => $t::t('Linked accounts', 'الحسابات المرتبطة'),
        'consent' => $t::t('Consent', 'الموافقة'),
        'consentNote' => $t::t('If any record opted out, the merged contact stays opted out.', 'إذا رفض أي سجل، تبقى جهة الاتصال المدموجة رافضة.'),
        'consentGranted' => $t::t('Opted in', 'موافق'),
        'consentDenied' => $t::t('Opted out', 'رافض'),
        'consentUnknown' => $t::t('Not asked', 'لم يُسأل'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'confirm' => $t::t('Merge', 'دمج'),
        'failed' => $t::t('The merge did not go through. Nothing was changed.', 'لم يتم الدمج. لم يتغير شيء.'),
        'needTwo' => $t::t('Pick at least two contacts to merge.', 'اختر جهتي اتصال على الأقل للدمج.'),
    ], array_diff_key($over, ['fields' => 1, 'channels' => 1]));
    $fieldNames = array_merge([
        'name' => $t::t('Name', 'الاسم'), 'email' => $t::t('Email', 'البريد'), 'phone' => $t::t('Phone', 'الهاتف'), 'company' => $t::t('Company', 'الشركة'),
        'jobTitle' => $t::t('Job title', 'المسمى الوظيفي'), 'owner' => $t::t('Owner', 'المسؤول'), 'tags' => $t::t('Tags', 'الوسوم'),
    ], (array) ($over['fields'] ?? []));
    $channelNames = array_merge(['email' => $t::t('Email', 'البريد'), 'whatsapp' => 'WhatsApp', 'phone' => $t::t('Phone', 'الهاتف')], (array) ($over['channels'] ?? []));
    $differ = fn (int $n): string => $ar ? ($n === 1 ? 'حقل واحد مختلف' : $n.' حقول مختلفة') : ($n === 1 ? '1 field differs' : $n.' fields differ');
    $mergeLabel = fn (int $n): string => $over['merge'] ?? ($ar ? 'دمج '.$n.' جهات اتصال' : 'Merge '.$n.' contacts');
    $confirmTitle = fn (string $name): string => $ar ? 'الدمج في '.$name.'؟' : 'Merge into '.$name.'?';
    $confirmBody = fn (int $n): string => $ar
        ? ($n === 1 ? 'يُحذف السجل الآخر' : 'تُحذف السجلات الأخرى وعددها '.$n).'. لا يمكن التراجع.'
        : ($n === 1 ? 'The other record is' : 'The other '.$n.' records are').' deleted. This cannot be undone.';

    $list = collect($records)->values()->all();
    $fieldList = $fields ?? array_map(
        fn ($f) => $f + ['label' => $fieldNames[$f['id']] ?? $f['id']],
        [['id' => 'name'], ['id' => 'email', 'ltr' => true], ['id' => 'phone', 'ltr' => true], ['id' => 'company'], ['id' => 'jobTitle'], ['id' => 'owner'], ['id' => 'tags', 'multi' => true]],
    );
    $fieldList = array_values($fieldList);

    // The logic is the React one (contact-merge-logic.ts): which fields differ and which record each field starts from.
    $blank = fn ($v): bool => $v === null || (is_string($v) ? trim($v) === '' : count((array) $v) === 0);
    $same = function ($a, $b): bool {
        if (is_string($a) || is_string($b)) return is_string($a) && is_string($b) && trim($a) === trim($b);
        $x = array_values((array) $a); $y = array_values((array) $b);
        sort($x); sort($y);
        return $x === $y;
    };
    $conflict = function (array $f) use ($list, $blank, $same): bool {
        $filled = array_values(array_filter(array_map(fn ($r) => $r['values'][$f['id']] ?? null, $list), fn ($v) => ! $blank($v)));
        foreach ($filled as $v) if (! $same($v, $filled[0])) return true;
        return false;
    };
    $survivorId = collect($list)->contains(fn ($r) => (string) $r['id'] === (string) $defaultSurvivorId) ? (string) $defaultSurvivorId : (string) ($list[0]['id'] ?? '');
    $survivor = collect($list)->first(fn ($r) => (string) $r['id'] === $survivorId) ?? ($list[0] ?? null);
    $choices = [];
    foreach ($fieldList as $f) {
        if (! empty($f['multi'])) { $choices[$f['id']] = 'all'; continue; }
        $owner = ! $blank($survivor['values'][$f['id']] ?? null) ? $survivor : collect($list)->first(fn ($r) => ! $blank($r['values'][$f['id']] ?? null));
        $choices[$f['id']] = (string) (($owner ?? $survivor)['id'] ?? '');
    }
    $conflicts = [];
    $identical = [];
    foreach ($fieldList as $n => $f) {
        if ($conflict($f)) $conflicts[$n] = $f;
        elseif (collect($list)->contains(fn ($r) => ! $blank($r['values'][$f['id']] ?? null))) $identical[$n] = $f;
    }

    // What moves over and the consent that survives do not depend on the choices.
    $totals = [];
    foreach ($list as $r) foreach ($r['stats'] ?? [] as $st) $totals[$st['label']] = ($totals[$st['label']] ?? 0) + $st['value'];
    $accountCount = collect($list)->flatMap(fn ($r) => array_map(fn ($i) => $i['channel'].':'.mb_strtolower($i['value']), $r['identities'] ?? []))->unique()->count();
    $consentRows = [];
    foreach (['email', 'whatsapp', 'phone'] as $c) {
        $states = array_map(fn ($r) => $r['consent'][$c] ?? null, $list);
        if (! array_filter($states)) continue;
        $consentRows[$c] = in_array('denied', $states, true) ? 'denied' : (in_array('granted', $states, true) ? 'granted' : 'unknown');
    }
    $others = count($list) - 1;
    $uid = 'contact-merge-'.\Illuminate\Support\Str::random(8);
    $config = [
        'fields' => array_map(fn ($f) => ['id' => (string) $f['id'], 'label' => (string) $f['label'], 'multi' => ! empty($f['multi']), 'ltr' => ! empty($f['ltr'])], $fieldList),
        'records' => array_map(fn ($r) => ['id' => (string) $r['id'], 'name' => (string) $r['name'], 'values' => (object) ($r['values'] ?? [])], $list),
        'survivor' => $survivorId,
        'choices' => (object) $choices,
        'title' => $confirmTitle('{name}'),
        'failed' => $s['failed'],
    ];
@endphp
@if (count($list) < 2 || ! $survivor)
    <x-nq::alert tone="info" data-slot="{{ $attributes->get('data-slot', 'contact-merge') }}" {{ $attributes->except('data-slot') }}>{{ $s['needTwo'] }}</x-nq::alert>
@else
<section data-slot="{{ $attributes->get('data-slot', 'contact-merge') }}" aria-labelledby="{{ $uid }}-title" x-data="nqContactMerge(@js($config))"
    {{ $attributes->except('data-slot')->cn('grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]') }}>
    <div class="flex min-w-0 flex-col gap-6">
        <header class="flex flex-col gap-1">
            <h2 id="{{ $uid }}-title" class="text-title-md text-foreground">{{ $s['title'] }}</h2>
            <p class="text-body text-muted-foreground">{{ $s['description'] }}</p>
        </header>

        <fieldset class="flex min-w-0 flex-col gap-2">
            <legend class="text-label text-foreground">{{ $s['survivor'] }}</legend>
            <p class="text-body-sm text-muted-foreground">{{ $s['survivorHint'] }}</p>
            <x-nq::radio-group x-model="survivor" :default-value="$survivorId" aria-label="{{ $s['survivor'] }}" class="grid gap-2 sm:grid-cols-2">
                @foreach ($list as $r)
                    <x-nq::radio-group.card :value="(string) $r['id']">
                        <span class="flex flex-col gap-0.5">
                            <span class="flex items-center gap-2">
                                <x-nq::avatar :name="$r['name']" :src="$r['avatar'] ?? null" size="sm" />
                                <span dir="auto" class="truncate">{{ $r['name'] }}</span>
                            </span>
                            @if (! empty($r['createdAt']) || ! empty($r['stats']))
                                <span class="flex flex-wrap gap-x-3 text-caption font-normal text-muted-foreground">
                                    @if (! empty($r['createdAt']))<span>{{ $s['created'] }} <x-nq::numeric.date-time :value="$r['createdAt']" /></span>@endif
                                    @foreach ($r['stats'] ?? [] as $st)<span>{{ $st['label'] }} <x-nq::numeric :value="$st['value']" /></span>@endforeach
                                </span>
                            @endif
                        </span>
                    </x-nq::radio-group.card>
                @endforeach
            </x-nq::radio-group>
        </fieldset>

        <div class="flex min-w-0 flex-col gap-4">
            <h3 class="flex items-center gap-2 text-title-sm text-foreground">{{ count($conflicts) ? $differ(count($conflicts)) : $s['noneDiffer'] }}</h3>
            @foreach ($conflicts as $fi => $f)
                <fieldset data-slot="contact-merge-field" class="flex min-w-0 flex-col gap-2">
                    <legend class="mb-2 text-label text-foreground">{{ $f['label'] }}</legend>
                    <x-nq::radio-group x-model="choices[config.fields[{{ $fi }}].id]" :default-value="$choices[$f['id']]" aria-label="{{ $f['label'] }}" class="grid gap-2 sm:grid-cols-2">
                        @if (! empty($f['multi']))
                            <x-nq::radio-group.card value="all" :title="$s['combineAll']" :description="$s['combined']" />
                        @endif
                        @foreach ($list as $r)
                            @php $v = $r['values'][$f['id']] ?? null; @endphp
                            @unless ($blank($v))
                                <x-nq::radio-group.card :value="(string) $r['id']" :description="$s['from'].' '.$r['name']">
                                    <x-nq::contact-merge._value :value="$v" :ltr="! empty($f['ltr'])" :empty="$s['empty']" />
                                </x-nq::radio-group.card>
                            @endunless
                        @endforeach
                    </x-nq::radio-group>
                </fieldset>
            @endforeach
            @if (count($identical))
                <details class="rounded-card border border-border bg-card px-3 py-2 text-body-sm">
                    <summary class="cursor-pointer text-muted-foreground">{{ $s['same'] }}</summary>
                    <dl class="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr]">
                        @foreach ($identical as $f)
                            @php $first = collect($list)->map(fn ($r) => $r['values'][$f['id']] ?? null)->first(fn ($v) => ! $blank($v)); @endphp
                            <div class="contents">
                                <dt class="text-muted-foreground">{{ $f['label'] }}</dt>
                                <dd><x-nq::contact-merge._value :value="$first" :ltr="! empty($f['ltr'])" :empty="$s['empty']" /></dd>
                            </div>
                        @endforeach
                    </dl>
                </details>
            @endif
        </div>
    </div>

    <aside aria-label="{{ $s['result'] }}" class="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
        <x-nq::card class="gap-3 p-4">
            <div class="flex flex-col gap-0.5">
                <h3 class="text-title-sm text-foreground">{{ $s['result'] }}</h3>
                <p class="text-caption text-muted-foreground">{{ $s['resultHint'] }}</p>
            </div>
            <dl data-slot="contact-merge-result" class="flex flex-col gap-2 text-body-sm">
                <template x-for="row in rows" :key="row.id">
                    <div class="flex flex-col">
                        <dt class="text-caption text-muted-foreground" x-text="row.label"></dt>
                        <dd class="min-w-0 break-words text-foreground">
                            <span x-show="row.tags" style="display: none" class="flex flex-wrap gap-1">
                                <template x-for="tag in row.items" :key="tag"><x-nq::badge variant="neutral" x-text="tag" /></template>
                            </span>
                            <bdi x-show="! row.tags && row.ltr" style="display: none" dir="ltr" class="tabular-nums" x-text="row.text"></bdi>
                            <span x-show="! row.tags && ! row.ltr" style="display: none" dir="auto" x-text="row.text"></span>
                        </dd>
                    </div>
                </template>
            </dl>
            @if (count($totals) || $accountCount)
                <div class="flex flex-col gap-1 border-t border-border pt-3">
                    <span class="text-label text-foreground">{{ $s['moves'] }}</span>
                    <ul class="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
                        @if ($accountCount)<li>{{ $s['identities'] }}: <x-nq::numeric :value="$accountCount" /></li>@endif
                        @foreach ($totals as $label => $n)<li>{{ $label }}: <x-nq::numeric :value="$n" /></li>@endforeach
                    </ul>
                </div>
            @endif
            @if (count($consentRows))
                <div class="flex flex-col gap-1 border-t border-border pt-3">
                    <span class="text-label text-foreground">{{ $s['consent'] }}</span>
                    <ul class="flex flex-col gap-1 text-body-sm">
                        @foreach ($consentRows as $c => $merged)
                            <li class="flex items-center justify-between gap-2">
                                <span>{{ $channelNames[$c] ?? $c }}</span>
                                <x-nq::badge :variant="$merged === 'granted' ? 'success' : ($merged === 'denied' ? 'danger' : 'outline')">{{ $merged === 'granted' ? $s['consentGranted'] : ($merged === 'denied' ? $s['consentDenied'] : $s['consentUnknown']) }}</x-nq::badge>
                            </li>
                        @endforeach
                    </ul>
                    <p class="flex items-start gap-1.5 text-caption text-muted-foreground">
                        <x-lucide-info aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
                        {{ $s['consentNote'] }}
                    </p>
                </div>
            @endif
        </x-nq::card>
        <div class="flex flex-wrap gap-2">
            <x-nq::button variant="primary" class="flex-1" x-on:click="ask()">
                <x-lucide-git-merge aria-hidden="true" />
                {{ $mergeLabel(count($list)) }}
            </x-nq::button>
            @if ($cancellable)
                <x-nq::button variant="ghost" x-on:click="cancel()">{{ $s['cancel'] }}</x-nq::button>
            @endif
        </div>
    </aside>

    <x-nq::alert-dialog x-model="confirming">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="confirmTitle">{{ $confirmTitle($survivor['name']) }}</span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>{{ $confirmBody($others) }}</x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert tone="danger" x-show="error" style="display: none"><span x-text="error"></span></x-nq::alert>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel x-bind:disabled="busy ? '' : null">{{ $s['cancel'] }}</x-nq::alert-dialog.cancel>
                <x-nq::button variant="primary" x-on:click="submit()" x-bind:disabled="busy ? '' : null" x-bind:aria-busy="busy ? 'true' : null">
                    <x-nq::spinner x-show="busy" style="display: none" />
                    {{ $s['confirm'] }}
                    <x-lucide-arrow-right aria-hidden="true" class="rtl:rotate-180" />
                </x-nq::button>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</section>
@endif

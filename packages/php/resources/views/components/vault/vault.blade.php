{{-- <x-nq::vault :secrets="$secrets" :access-log="$log" @reveal="$event.detail.wait(…)" @save="$event.detail.wait(…)" @delete="$event.detail.wait(…)" />
     A secrets vault: secrets grouped by project or service with masked values, reveal and copy that fetch the value only when asked,
     a value that hides itself again, expiry warnings, add, edit and delete, and an access log table. The page never holds a value
     until someone reveals or copies it: your handler returns it.
     secrets: [['id', 'name', 'group', 'kind' => api-key | password | token | certificate | ssh-key | other, 'description', 'hint' => '…4242',
       'updatedAt', 'lastAccessedAt', 'expiresAt']]; dates are DateTime, ISO strings or unix seconds.
     access-log: [['id', 'secretName', 'actor', 'action' => reveal | copy | create | update | delete, 'at', 'address']] (listed newest first).
     editable / deletable (true): show Add and Edit, and Delete. reveal-timeout: milliseconds a revealed value stays visible (15000, minimum 1000).
     loading shows a skeleton. title / description replace the heading and the line under it.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       reveal  detail { id, purpose: 'reveal' | 'copy' }; resolve { value } or { error }
       save    detail { input: { name, group, kind, value, description?, expiresAt? }, id }; id is null when adding; resolve, or resolve { error }
       delete  detail { id }; resolve, or resolve { error }
     A rejected promise shows a generic error. After success re-render the list with the new secrets.
     The filter box shows only with more than five secrets. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['secrets' => [], 'accessLog' => [], 'editable' => true, 'deletable' => true, 'loading' => false, 'revealTimeout' => 15000, 'title' => null, 'description' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $uid = 'nq-vault-'.\Illuminate\Support\Str::random(6);
    $date = fn ($v) => $v === null || $v === '' ? null : ($v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v)));
    $now = \Carbon\Carbon::now();
    $mask = '••••••••••••';
    $kinds = [
        'api-key' => $t::t('API key', 'مفتاح API'), 'password' => $t::t('Password', 'كلمة مرور'), 'token' => $t::t('Token', 'رمز'),
        'certificate' => $t::t('Certificate', 'شهادة'), 'ssh-key' => $t::t('SSH key', 'مفتاح SSH'), 'other' => $t::t('Secret', 'سر'),
    ];
    $actionLabels = [
        'reveal' => $t::t('Revealed', 'كُشف'), 'copy' => $t::t('Copied', 'نُسخ'), 'create' => $t::t('Created', 'أُنشئ'),
        'update' => $t::t('Updated', 'عُدّل'), 'delete' => $t::t('Deleted', 'حُذف'),
    ];
    $actionTone = ['reveal' => 'warning', 'copy' => 'info', 'create' => 'success', 'update' => 'neutral', 'delete' => 'danger'];
    $title ??= $t::t('Vault', 'الخزنة');
    $description ??= $t::t('Secrets stay hidden until someone with access reveals them. Every reveal and copy is logged.', 'تبقى الأسرار مخفية إلى أن يكشفها من يملك الصلاحية. يُسجَّل كل كشف ونسخ.');
    $count = fn ($n) => $n === 1 ? $t::t('1 secret', 'سر واحد') : $t::t("{$n} secrets", "{$n} أسرار");
    $ungrouped = $t::t('Ungrouped', 'بلا مجموعة');

    $list = collect($secrets)->map(fn ($s) => (array) $s)->map(function ($s) {
        $s['group'] = trim((string) ($s['group'] ?? ''));
        return $s;
    })->values();
    $groups = $list->groupBy('group')->map(fn ($items) => $items->sort(fn ($a, $b) => strnatcasecmp($a['name'], $b['name']))->values())
        ->sortBy(fn ($items, $g) => ($g === '' ? "\u{10FFFF}" : mb_strtolower((string) $g)), SORT_NATURAL)->all();
    // groupBy turns numeric-looking keys into ints; keep them strings.
    $groups = collect($groups)->mapWithKeys(fn ($items, $g) => [(string) $g => $items])->all();
    $meta = $list->mapWithKeys(fn ($s) => [(string) $s['id'] => [
        'name' => $s['name'], 'group' => $s['group'], 'kind' => $s['kind'] ?? 'api-key', 'description' => $s['description'] ?? '',
        'expires' => ($e = $date($s['expiresAt'] ?? null)) ? $e->format('Y-m-d') : '',
    ]])->all();
    $search = $list->mapWithKeys(fn ($s) => [(string) $s['id'] => mb_strtolower($s['name'].' '.$s['group'].' '.($s['description'] ?? ''))])->all();
    $groupIds = collect($groups)->values()->map(fn ($items) => $items->pluck('id')->map(fn ($i) => (string) $i)->all())->all();
    $expiry = function ($s) use ($date, $now) {
        $e = $date($s['expiresAt'] ?? null);
        if ($e === null) return ['none', 0];
        $left = $e->getTimestamp() - $now->getTimestamp();
        if ($left <= 0) return ['expired', 0];
        return [$left <= 14 * 86400 ? 'soon' : 'ok', (int) ceil($left / 86400)];
    };
    $expiresIn = fn ($d) => $d === 1 ? $t::t('Expires in 1 day', 'ينتهي بعد يوم') : $t::t("Expires in {$d} days", "ينتهي بعد {$d} أيام");
    $canFilter = count($list) > 5;
    $hideMs = max(1000, (int) $revealTimeout);

    // The table's date column is date-only, so the log shows the formatted date and time as text (rows arrive newest first).
    $fmtAt = function ($v) use ($date) {
        $d = $date($v);
        if ($d === null) return '';
        $tz = $d->getTimezone()->getName();
        $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]d/', $tz) ? 'GMT'.$tz : $tz);
        return (new IntlDateFormatter(app()->getLocale().'-u-nu-latn', IntlDateFormatter::MEDIUM, IntlDateFormatter::SHORT, $tz))->format($d->getTimestamp());
    };
    $logRows = collect($accessLog)->map(fn ($e) => (array) $e)->sortByDesc(fn ($e) => $date($e['at'])?->getTimestamp() ?? 0)->values()
        ->map(fn ($e) => [
            'id' => (string) $e['id'], 'at' => $fmtAt($e['at']), 'actor' => $e['actor'] ?? '',
            'action' => $e['action'], 'secret' => $e['secretName'], 'address' => $e['address'] ?? '-',
        ])->all();
    $logColumns = [
        ['id' => 'at', 'header' => $t::t('When', 'متى'), 'type' => 'text'],
        ['id' => 'actor', 'header' => $t::t('Who', 'من'), 'sortable' => true, 'searchable' => true],
        ['id' => 'action', 'header' => $t::t('Action', 'الإجراء'), 'type' => 'status', 'filter' => true,
            'options' => collect($actionLabels)->map(fn ($label, $v) => ['value' => $v, 'label' => $label, 'tone' => $actionTone[$v]])->values()->all()],
        ['id' => 'secret', 'header' => $t::t('Secret', 'السر'), 'sortable' => true, 'searchable' => true],
        ['id' => 'address', 'header' => $t::t('Address', 'العنوان'), 'searchable' => true],
    ];

    $config = [
        'ids' => collect($list)->pluck('id')->map(fn ($i) => (string) $i)->all(),
        'groups' => $groupIds,
        'search' => (object) $search,
        'secrets' => (object) $meta,
        'hideMs' => $hideMs,
        'labels' => [
            'revealFailed' => $t::t('Could not fetch the value.', 'تعذّر جلب القيمة.'),
            'copyFailed' => $t::t('Could not copy', 'تعذّر النسخ'),
            'copied' => $t::t('Copied to clipboard', 'تم النسخ إلى الحافظة'),
            'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
            'autoHide' => $t::t('Hides again in {n} seconds', 'تُخفى من جديد خلال {n} ثانية'),
            'addTitle' => $t::t('Add secret', 'إضافة سر'),
            'editTitle' => $t::t('Edit {name}', 'تعديل {name}'),
            'deleteTitle' => $t::t('Delete {name}?', 'حذف {name}؟'),
            'nameEmpty' => $t::t('Enter a name.', 'أدخل اسمًا.'),
            'nameDuplicate' => $t::t('A secret with this name already exists in this group.', 'يوجد سر بهذا الاسم في هذه المجموعة.'),
            'valueEmpty' => $t::t('Enter the value.', 'أدخل القيمة.'),
        ],
    ];
    $btn = 'ghost';
@endphp
<section data-slot="vault" aria-label="{{ $title }}" x-data="nqVault(@js($config))" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
            <h3 class="flex items-center gap-2 text-h3 text-foreground">
                <x-lucide-key-round aria-hidden="true" class="size-5 text-muted-foreground" />
                {{ $title }}
            </h3>
            <p class="max-w-prose text-body-sm text-muted-foreground">{{ $description }}</p>
        </div>
        @if ($editable)
            <x-nq::button type="button" size="sm" variant="primary" x-on:click="openAdd()">
                <x-lucide-plus aria-hidden="true" />
                {{ $t::t('Add secret', 'إضافة سر') }}
            </x-nq::button>
        @endif
    </header>

    <template x-if="notice">
        <x-nq::alert tone="danger" role="alert" dismissible x-on:nq:dismiss="notice = null"><span x-text="notice"></span></x-nq::alert>
    </template>

    <x-nq::tabs default-value="secrets">
        <x-nq::tabs.list variant="underline" aria-label="{{ $title }}">
            <x-nq::tabs.tab value="secrets">
                {{ $t::t('Secrets', 'الأسرار') }}
                <span class="ms-1.5 text-caption text-muted-foreground tabular-nums">{{ count($list) }}</span>
            </x-nq::tabs.tab>
            <x-nq::tabs.tab value="log">{{ $t::t('Access log', 'سجل الوصول') }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="secrets" class="flex flex-col gap-4">
            @if ($loading)
                <x-nq::states.loading :label="$t::t('Loading secrets', 'جارٍ تحميل الأسرار')" :rows="4" />
            @elseif (count($list) === 0)
                <x-nq::states.empty icon="key-round" :title="$t::t('The vault is empty', 'الخزنة فارغة')" :description="$t::t('Store API keys, passwords and certificates here instead of in chat or files.', 'احفظ مفاتيح API وكلمات المرور والشهادات هنا بدل المحادثات والملفات.')">
                    @if ($editable)
                        <x-slot:actions>
                            <x-nq::button type="button" variant="primary" x-on:click="openAdd()">
                                <x-lucide-plus aria-hidden="true" />
                                {{ $t::t('Add secret', 'إضافة سر') }}
                            </x-nq::button>
                        </x-slot:actions>
                    @endif
                </x-nq::states.empty>
            @else
                @if ($canFilter)
                    <x-nq::input-group class="max-w-sm">
                        <x-nq::input-group.addon align="start"><x-lucide-search aria-hidden="true" class="size-4 text-muted-foreground" /></x-nq::input-group.addon>
                        <x-nq::input-group.input ltr type="search" x-model="filter" placeholder="{{ $t::t('Filter secrets', 'تصفية الأسرار') }}" aria-label="{{ $t::t('Filter secrets', 'تصفية الأسرار') }}" />
                    </x-nq::input-group>
                @endif
                <p x-show="noneMatch()" style="display: none" class="rounded-card border border-dashed border-border px-4 py-8 text-center text-body-sm text-muted-foreground">{{ $t::t('No secrets match your filter.', 'لا توجد أسرار تطابق التصفية.') }}</p>
                @php $gi = 0; @endphp
                @foreach ($groups as $group => $items)
                    <section aria-label="{{ $group !== '' ? $group : $ungrouped }}" x-show="groupShown({{ $gi }})" class="flex flex-col gap-2">
                        <h4 class="flex items-baseline gap-2 text-label text-foreground">
                            @if ($group !== '')<bdi dir="auto">{{ $group }}</bdi>@else{{ $ungrouped }}@endif
                            <span class="text-caption font-normal text-muted-foreground">{{ $count(count($items)) }}</span>
                        </h4>
                        <ul class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
                            @foreach ($items as $s)
                                @php
                                    [$state, $days] = $expiry($s);
                                    $sid = (string) $s['id'];
                                    $name = $s['name'];
                                    $last = $date($s['lastAccessedAt'] ?? null);
                                @endphp
                                <li data-slot="vault-secret" x-data="{ sid: @js($sid) }" x-show="matches(sid)" x-bind:data-revealed="isShown(sid) ? '' : null"
                                    class="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
                                    <div class="flex min-w-0 flex-col gap-1 sm:w-2/5">
                                        <div class="flex min-w-0 flex-wrap items-center gap-2">
                                            <bdi dir="ltr" class="truncate font-mono text-code font-medium text-foreground">{{ $name }}</bdi>
                                            <x-nq::badge variant="neutral" class="shrink-0"><x-lucide-lock aria-hidden="true" />{{ $kinds[$s['kind'] ?? 'other'] ?? $kinds['other'] }}</x-nq::badge>
                                            @if ($state === 'soon')
                                                <x-nq::badge variant="warning" class="shrink-0">{{ $expiresIn(max(1, $days)) }}</x-nq::badge>
                                            @elseif ($state === 'expired')
                                                <x-nq::badge variant="danger" class="shrink-0">{{ $t::t('Expired', 'منتهي') }}</x-nq::badge>
                                            @endif
                                        </div>
                                        @if (! empty($s['description']))<span class="truncate text-caption text-muted-foreground">{{ $s['description'] }}</span>@endif
                                        <span class="text-caption text-muted-foreground">{{ $t::t('Last used', 'آخر استخدام') }}: @if ($last)<x-nq::numeric.date-time :value="$s['lastAccessedAt']" relative />@else{{ $t::t('never', 'أبدًا') }}@endif</span>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div x-show="isShown(sid)" style="display: none" class="flex flex-col gap-0.5">
                                            <bdi dir="ltr" data-slot="vault-value" class="block break-all font-mono text-code text-foreground" x-text="valueFor(sid)"></bdi>
                                            <span class="text-caption text-muted-foreground" x-text="autoHide()"></span>
                                        </div>
                                        <span x-show="!isShown(sid)" data-slot="vault-value" dir="ltr" role="text" aria-label="{{ $t::t('Value hidden', 'القيمة مخفية') }}" class="block font-mono text-code text-muted-foreground">{{ $mask }}@if (! empty($s['hint']))<span class="ms-1">{{ $s['hint'] }}</span>@endif</span>
                                    </div>
                                    <div class="flex shrink-0 items-center gap-0.5">
                                        <x-nq::button type="button" variant="ghost" size="icon-sm" data-reveal-label="{{ $t::t('Reveal '.$name, 'كشف '.$name) }}" data-hide-label="{{ $t::t('Hide '.$name, 'إخفاء '.$name) }}"
                                            x-bind:aria-label="isShown(sid) ? $el.dataset.hideLabel : $el.dataset.revealLabel"
                                            x-bind:aria-pressed="isShown(sid) ? 'true' : 'false'" x-bind:aria-busy="busyOn(sid) ? 'true' : null" x-on:click="toggle(sid)">
                                            <x-nq::spinner x-show="busyOn(sid)" style="display: none" />
                                            <x-lucide-eye aria-hidden="true" x-show="eyeOn(sid)" />
                                            <x-lucide-eye-off aria-hidden="true" x-show="eyeOffOn(sid)" style="display: none" />
                                        </x-nq::button>
                                        <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t::t('Copy '.$name, 'نسخ '.$name) }}" x-on:click="copy(sid)"
                                            x-bind:data-copied="isCopied(sid) ? '' : null" class="data-copied:text-nq-success-text">
                                            <x-lucide-copy aria-hidden="true" x-show="!isCopied(sid)" />
                                            <x-lucide-check aria-hidden="true" x-show="isCopied(sid)" style="display: none" />
                                        </x-nq::button>
                                        @if ($editable)
                                            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t::t('Edit '.$name, 'تعديل '.$name) }}" x-on:click="openEdit(sid)">
                                                <x-lucide-pencil aria-hidden="true" />
                                            </x-nq::button>
                                        @endif
                                        @if ($deletable)
                                            <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t::t('Delete '.$name, 'حذف '.$name) }}" class="text-nq-danger-text" x-on:click="askDelete(sid)">
                                                <x-lucide-trash-2 aria-hidden="true" />
                                            </x-nq::button>
                                        @endif
                                    </div>
                                </li>
                            @endforeach
                        </ul>
                    </section>
                    @php $gi++; @endphp
                @endforeach
                <span role="status" aria-live="polite" class="sr-only" x-text="copiedId ? config.labels.copied : ''"></span>
            @endif
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="log" class="flex flex-col gap-3">
            <x-nq::data-table :label="$t::t('Access log', 'سجل الوصول')" :columns="$logColumns" :rows="$logRows" :page-size="10" :loading="$loading"
                :search="$t::t('Search the log', 'ابحث في السجل')" :view-options="false">
                <x-slot:empty><x-nq::states.empty :title="$t::t('Nothing has been accessed yet', 'لم يُطلع على أي سر بعد')" icon="inbox" /></x-slot:empty>
            </x-nq::data-table>
        </x-nq::tabs.panel>
    </x-nq::tabs>

    @if ($editable)
        <x-nq::dialog x-model="formOpen">
            <x-nq::dialog.content>
                <form novalidate data-slot="vault-secret-dialog" class="grid gap-4" x-on:submit.prevent="submit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="formTitle()"></span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $t::t('Secrets with the same group are listed together, like a project or a service.', 'تُعرض الأسرار ذات المجموعة نفسها معًا، مثل مشروع أو خدمة.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field x-model="nameInvalid">
                        <x-nq::field.label>{{ $t::t('Name', 'الاسم') }}</x-nq::field.label>
                        <x-nq::field.input ltr x-model="draft.name" autocomplete="off" spellcheck="false" placeholder="STRIPE_SECRET_KEY" class="font-mono text-code" />
                        <p role="alert" x-show="nameInvalid" style="display: none" class="text-caption text-nq-danger-text" x-text="nameMessage"></p>
                    </x-nq::field>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field>
                            <x-nq::field.label>{{ $t::t('Group', 'المجموعة') }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.group" list="{{ $uid }}-groups" autocomplete="off" />
                            <datalist id="{{ $uid }}-groups">
                                @foreach (array_filter(array_keys($groups), fn ($g) => $g !== '') as $g)<option value="{{ $g }}"></option>@endforeach
                            </datalist>
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $t::t('Type', 'النوع') }}</x-nq::field.label>
                            <x-nq::select value="api-key" x-model="draft.kind">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($kinds as $k => $label)<x-nq::select.item :value="$k">{{ $label }}</x-nq::select.item>@endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                    </div>
                    <x-nq::field x-model="valueInvalid">
                        <x-nq::field.label>{{ $t::t('Value', 'القيمة') }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="draft.value" dir="ltr" rows="3" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
                            x-bind:class="showValue ? '' : '[-webkit-text-security:disc]'" class="min-h-20 font-mono text-code text-start" />
                        <span x-show="editId" style="display: none" class="text-caption text-muted-foreground">{{ $t::t('Leave blank to keep the current value.', 'اتركه فارغًا للإبقاء على القيمة الحالية.') }}</span>
                        <p role="alert" x-show="valueInvalid" style="display: none" class="text-caption text-nq-danger-text">{{ $t::t('Enter the value.', 'أدخل القيمة.') }}</p>
                        <button type="button" x-on:click="showValue = !showValue" x-bind:aria-pressed="showValue ? 'true' : 'false'"
                            class="inline-flex w-fit items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <x-lucide-eye-off aria-hidden="true" class="size-3.5" x-show="showValue" style="display: none" />
                            <x-lucide-eye aria-hidden="true" class="size-3.5" x-show="!showValue" />
                            {{ $t::t('Show value', 'إظهار القيمة') }}
                        </button>
                    </x-nq::field>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field>
                            <x-nq::field.label>{{ $t::t('Note (optional)', 'ملاحظة (اختياري)') }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.note" autocomplete="off" />
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $t::t('Expires on (optional)', 'ينتهي في (اختياري)') }}</x-nq::field.label>
                            <x-nq::field.input ltr type="date" x-model="draft.expires" />
                        </x-nq::field>
                    </div>
                    <template x-if="formError"><x-nq::alert tone="danger" role="alert"><span x-text="formError"></span></x-nq::alert></template>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="formOpen = false" x-bind:disabled="pending ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="pending ? 'true' : null" x-bind:data-disabled="pending ? '' : null">
                            <x-nq::spinner x-show="pending" style="display: none" />
                            {{ $t::t('Save', 'حفظ') }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($deletable)
        <x-nq::alert-dialog x-model="deleteOpen">
            <x-nq::alert-dialog.content>
                <div data-slot="vault-delete-dialog" class="contents">
                    <x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.title><bdi dir="ltr" class="font-mono" x-text="deleteTitle()"></bdi></x-nq::alert-dialog.title>
                        <x-nq::alert-dialog.description>{{ $t::t('The value is removed from the vault for everyone. Anything still using it will stop working.', 'تُزال القيمة من الخزنة للجميع. وأي شيء ما زال يستخدمها سيتوقف عن العمل.') }}</x-nq::alert-dialog.description>
                    </x-nq::alert-dialog.header>
                    <template x-if="deleteError"><x-nq::alert tone="danger" role="alert"><span x-text="deleteError"></span></x-nq::alert></template>
                    <x-nq::alert-dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="deleteOpen = false" x-bind:disabled="pending ? '' : null">{{ $t::t('Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="button" variant="danger" x-on:click="confirmDelete()" x-bind:aria-busy="pending ? 'true' : null" x-bind:data-disabled="pending ? '' : null">
                            <x-nq::spinner x-show="pending" style="display: none" />
                            {{ $t::t('Delete', 'حذف') }}
                        </x-nq::button>
                    </x-nq::alert-dialog.footer>
                </div>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</section>

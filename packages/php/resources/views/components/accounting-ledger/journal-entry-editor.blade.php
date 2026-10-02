{{-- <x-nq::accounting-ledger.journal-entry-editor :accounts="$accounts" currency="SAR" number="JE-0009" can-save-draft @nq-accounting-post="$event.detail.waitUntil(save($event.detail.value))" />
     A balanced journal entry: date, memo and lines of account + debit or credit. Amounts are integer minor units, the running difference is exact,
     and Post stays off until the entry balances. Typing on one side of a line clears the other. Each line has a more menu and the same actions on context-click:
     balance with this line, duplicate, remove (at least two lines stay).
     accounts: [['id', 'code', 'name', 'type', 'parentId', 'archived']]; only active leaf accounts can be picked.
     date (ISO, default today), memo, lines: [['id', 'accountId', 'memo', 'debit', 'credit']] the starting value (two blank lines by default).
     currency: ISO 4217 (USD, or SAR in Arabic). number shows as the entry number. read-only locks the fields. can-save-draft shows Save draft.
     Events on the root: "nq-change" { value } after every edit; "nq-accounting-post" and "nq-accounting-draft" { value, waitUntil(promise), resolve(), reject(message) }.
     Nobody claiming a post event: the editor resets at once. A claimed one keeps it busy; a rejection keeps the entry as it is.
     labels: override any built-in string by key. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['accounts' => [], 'currency' => null, 'number' => null, 'date' => null, 'memo' => '', 'lines' => [], 'readOnly' => false, 'canSaveDraft' => false, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $strings = [
        'date' => $n::t('Date', 'التاريخ'),
        'memo' => $n::t('Memo', 'البيان'),
        'entryNumber' => $n::t('Entry number', 'رقم القيد'),
        'lines' => $n::t('Lines', 'البنود'),
        'account' => $n::t('Account', 'الحساب'),
        'debit' => $n::t('Debit', 'مدين'),
        'credit' => $n::t('Credit', 'دائن'),
        'line' => $n::t('Line', 'البند'),
        'pickAccount' => $n::t('Pick an account', 'اختر حسابًا'),
        'noAccountMatch' => $n::t('No account matches', 'لا يوجد حساب مطابق'),
        'linePlaceholder' => $n::t('Line memo', 'بيان البند'),
        'addLine' => $n::t('Add line', 'إضافة بند'),
        'removeLine' => $n::t('Remove line', 'حذف البند'),
        'duplicateLine' => $n::t('Duplicate line', 'تكرار البند'),
        'balanceLine' => $n::t('Balance with this line', 'موازنة القيد بهذا البند'),
        'lineActions' => $n::t('Line actions', 'إجراءات البند'),
        'totals' => $n::t('Totals', 'الإجماليات'),
        'difference' => $n::t('Difference', 'الفرق'),
        'balanced' => $n::t('Balanced', 'متوازن'),
        'outOfBalance' => $n::t('Out of balance', 'غير متوازن'),
        'post' => $n::t('Post entry', 'ترحيل القيد'),
        'saveDraft' => $n::t('Save draft', 'حفظ كمسودة'),
        'problemFewLines' => $n::t('An entry needs at least two lines with an amount.', 'يحتاج القيد إلى بندين على الأقل بمبلغ.'),
        'problemNoAccount' => $n::t('Every line with an amount needs an account.', 'كل بند بمبلغ يحتاج إلى حساب.'),
        'problemBothSides' => $n::t('A line is either a debit or a credit, not both.', 'البند إما مدين أو دائن، وليس كليهما.'),
        'problemNegative' => $n::t('Amounts cannot be negative.', 'لا يمكن أن تكون المبالغ سالبة.'),
        'problemUnbalanced' => $n::t('Debits and credits must be equal.', 'يجب أن يتساوى المدين والدائن.'),
        'problemZero' => $n::t('Enter an amount.', 'أدخل مبلغًا.'),
    ];
    $strings = array_merge($strings, $labels);
    $accounts = array_values((array) $accounts);
    $parents = collect($accounts)->pluck('parentId')->filter()->all();
    $postable = collect($accounts)->filter(fn ($a) => empty($a['archived']) && ! in_array($a['id'], $parents, true))->values()->all();
    $code = strtoupper($currency ?? $n::currency(app()->getLocale()));
    $config = [
        'accounts' => $accounts, 'currency' => $code, 'locale' => $n::rtl() ? 'ar' : 'en', 'number' => $number,
        'date' => $date, 'memo' => $memo, 'lines' => array_values((array) $lines), 'readOnly' => (bool) $readOnly, 'canSaveDraft' => (bool) $canSaveDraft,
        'today' => \Carbon\Carbon::now()->toDateString(), 't' => $strings,
    ];
    $grid = '@2xl:grid-cols-[minmax(13rem,1.5fr)_minmax(8rem,1fr)_9rem_9rem_2rem]';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'journal-entry-editor') }}" x-data="nqAccountingEntry(@js($config))" {{ $attributes->except('data-slot')->cn('@container flex w-full min-w-0 flex-col gap-4') }}>
    <div class="grid gap-3 @lg:grid-cols-[10rem_minmax(0,1fr)_auto]">
        <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ $strings['date'] }}
            <x-nq::field.input type="date" ltr x-model="date" x-bind:disabled="readOnly" />
        </label>
        <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ $strings['memo'] }}
            <x-nq::field.input x-model="memo" x-bind:disabled="readOnly" />
        </label>
        @if ($number)
            <div class="flex flex-col gap-1.5 text-label text-foreground">
                {{ $strings['entryNumber'] }}
                <span class="flex h-control items-center"><bdi dir="ltr" class="text-body-sm tabular-nums text-muted-foreground">{{ $number }}</bdi></span>
            </div>
        @endif
    </div>

    <div class="flex flex-col gap-2" role="group" aria-label="{{ $strings['lines'] }}">
        <div aria-hidden="true" class="hidden gap-3 px-3 text-caption text-muted-foreground @2xl:grid {{ $grid }}">
            <span>{{ $strings['account'] }}</span>
            <span>{{ $strings['memo'] }}</span>
            <span class="text-end">{{ $strings['debit'] }}</span>
            <span class="text-end">{{ $strings['credit'] }}</span>
            <span></span>
        </div>
        <ul class="flex flex-col gap-2">
            <template x-for="(line, index) in lines" :key="line.id">
                <li x-data="nqContextMenu()" x-bind="trigger" class="list-none">
                    <div data-slot="entry-line" role="group" x-bind:aria-label="`${t.line} ${index + 1}`"
                        class="grid grid-cols-2 items-start gap-x-3 gap-y-3 rounded-floating border border-border bg-card p-3 @2xl:gap-y-0 @2xl:rounded-control {{ $grid }}">
                        <div class="col-span-2 @2xl:col-span-1">
                            <x-nq::combobox x-model="line.accountId">
                                <x-nq::combobox.input :clearable="false" placeholder="{{ $strings['pickAccount'] }}" :trigger-label="$strings['pickAccount']" :clear-label="$strings['pickAccount']"
                                    x-bind:aria-label="`${t.account}, ${t.line} ${index + 1}`" x-bind:disabled="readOnly" x-bind:data-invalid="noAccount(line) ? '' : null"
                                    x-bind:aria-invalid="noAccount(line) ? 'true' : null" />
                                <x-nq::combobox.content>
                                    <x-nq::combobox.empty>{{ $strings['noAccountMatch'] }}</x-nq::combobox.empty>
                                    <x-nq::combobox.list>
                                        @foreach ($postable as $a)
                                            <x-nq::combobox.item :value="(string) $a['id']">
                                                <span class="flex min-w-0 items-baseline gap-2"><bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ $a['code'] }}</bdi><span class="truncate">{{ $a['name'] }}</span></span>
                                            </x-nq::combobox.item>
                                        @endforeach
                                    </x-nq::combobox.list>
                                </x-nq::combobox.content>
                            </x-nq::combobox>
                        </div>
                        <div class="col-span-2 @2xl:col-span-1">
                            <x-nq::field.input x-model="line.memo" placeholder="{{ $strings['linePlaceholder'] }}" x-bind:disabled="readOnly" x-bind:aria-label="`${t.memo}, ${t.line} ${index + 1}`" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ $strings['debit'] }}</span>
                            <x-nq::currency-input x-model="line.debit" :currency="$code" symbol="none" :min="0" x-bind:disabled="readOnly" x-bind:aria-label="`${t.debit}, ${t.line} ${index + 1}`" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ $strings['credit'] }}</span>
                            <x-nq::currency-input x-model="line.credit" :currency="$code" symbol="none" :min="0" x-bind:disabled="readOnly" x-bind:aria-label="`${t.credit}, ${t.line} ${index + 1}`" />
                        </div>
                        <div class="col-span-2 flex justify-end @2xl:col-span-1">
                            @if (! $readOnly)
                                <x-nq::dropdown-menu>
                                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="line-item-actions" class="text-muted-foreground" x-bind:aria-label="`${t.lineActions}, ${t.line} ${index + 1}`">
                                        <x-lucide-ellipsis aria-hidden="true" />
                                    </x-nq::dropdown-menu.trigger>
                                    <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                        <x-nq::dropdown-menu.group>
                                            <x-nq::dropdown-menu.item x-bind:disabled="!canBalance(line)" x-on:click="balanceLine(line.id)"><x-lucide-scale aria-hidden="true" />{{ $strings['balanceLine'] }}</x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.group>
                                        <x-nq::dropdown-menu.separator />
                                        <x-nq::dropdown-menu.group>
                                            <x-nq::dropdown-menu.item x-on:click="duplicate(index)"><x-lucide-copy aria-hidden="true" />{{ $strings['duplicateLine'] }}</x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.group>
                                        <x-nq::dropdown-menu.separator />
                                        <x-nq::dropdown-menu.group>
                                            <x-nq::dropdown-menu.item variant="danger" x-bind:disabled="canRemove() ? null : ''" x-on:click="remove(line.id)"><x-lucide-trash-2 aria-hidden="true" />{{ $strings['removeLine'] }}</x-nq::dropdown-menu.item>
                                        </x-nq::dropdown-menu.group>
                                    </x-nq::dropdown-menu.content>
                                </x-nq::dropdown-menu>
                            @endif
                        </div>
                    </div>
                    @if (! $readOnly)
                        <template x-teleport="body">
                            <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                                class="fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                <x-nq::context-menu.item x-bind:disabled="!canBalance(line)" x-on:click="balanceLine(line.id)"><x-lucide-scale aria-hidden="true" />{{ $strings['balanceLine'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.separator />
                                <x-nq::context-menu.item x-on:click="duplicate(index)"><x-lucide-copy aria-hidden="true" />{{ $strings['duplicateLine'] }}</x-nq::context-menu.item>
                                <x-nq::context-menu.separator />
                                <x-nq::context-menu.item variant="danger" x-bind:disabled="canRemove() ? null : ''" x-on:click="remove(line.id)"><x-lucide-trash-2 aria-hidden="true" />{{ $strings['removeLine'] }}</x-nq::context-menu.item>
                            </div>
                        </template>
                    @endif
                </li>
            </template>
        </ul>
        <div x-show="!readOnly">
            <x-nq::button type="button" variant="secondary" size="sm" x-on:click="add()"><x-lucide-plus aria-hidden="true" />{{ $strings['addLine'] }}</x-nq::button>
        </div>
    </div>

    <div role="region" aria-label="{{ $strings['totals'] }}" class="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
        <div class="grid grid-cols-2 items-baseline gap-3 {{ $grid }}">
            <span class="col-span-2 text-label text-foreground">{{ $strings['totals'] }}</span>
            <span class="text-end text-label tabular-nums" data-slot="entry-total-debit" x-text="fig(totals.debit)"></span>
            <span class="text-end text-label tabular-nums" data-slot="entry-total-credit" x-text="fig(totals.credit)"></span>
            <span class="hidden @2xl:block"></span>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
            <span class="text-body-sm text-muted-foreground">{{ $strings['difference'] }}</span>
            <span class="flex items-center gap-2">
                <x-nq::badge variant="success" x-show="totals.balanced">{{ $strings['balanced'] }}</x-nq::badge>
                <x-nq::badge variant="neutral" x-show="isBlank">{{ $strings['outOfBalance'] }}</x-nq::badge>
                <x-nq::badge variant="danger" x-show="isOff">{{ $strings['outOfBalance'] }}</x-nq::badge>
                <span x-show="totals.difference !== 0" class="text-label tabular-nums" data-slot="entry-difference" x-text="fig(difference)"></span>
            </span>
        </div>
        <ul x-show="tried && problems.length > 0" role="alert" class="flex flex-col gap-0.5 text-caption text-nq-danger-text">
            <template x-for="p in problems" :key="p"><li x-text="p"></li></template>
        </ul>
    </div>

    <div x-show="!readOnly" class="flex flex-wrap justify-end gap-2">
        @if ($canSaveDraft)
            <x-nq::button type="button" variant="secondary" x-bind:disabled="busy === 'post'" x-on:click="submit('draft')">{{ $strings['saveDraft'] }}</x-nq::button>
        @endif
        <x-nq::button type="button" variant="primary" data-slot="entry-post" x-bind:disabled="!canPost" x-on:click="submit('post')">{{ $strings['post'] }}</x-nq::button>
    </div>
</div>

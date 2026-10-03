{{-- <x-nq::accounting-ledger.chart-of-accounts :accounts="$accounts" :entries="$entries" currency="SAR" can-select can-add-child can-archive />
     The account tree: code, name, type and balance per row, groups that collapse, and a row menu (also on context-click) with the same actions.
     accounts: [['id', 'code', 'name', 'type' => asset|liability|equity|revenue|expense, 'parentId', 'archived']]
     entries: posted entries [['id', 'number', 'date', 'status' => posted, 'lines' => [['accountId', 'debit', 'credit']]]]; amounts are integer minor units,
     a group shows the sum of its whole branch. currency: ISO 4217 (USD, or SAR in Arabic). selected-id highlights a row.
     can-select adds "View statement" (event "nq-select-account"), can-add-child adds "Add sub-account" (event "nq-add-child"),
     can-archive adds archive and restore (event "nq-archive-change" { account, archived }; preventDefault() keeps the row as it is).
     labels: override any built-in string by key. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['accounts' => [], 'entries' => [], 'currency' => null, 'selectedId' => null, 'canSelect' => false, 'canAddChild' => false, 'canArchive' => false, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $strings = [
        'chart' => $n::t('Chart of accounts', 'دليل الحسابات'),
        'account' => $n::t('Account', 'الحساب'),
        'type' => $n::t('Type', 'النوع'),
        'balance' => $n::t('Balance', 'الرصيد'),
        'rowActions' => $n::t('Account actions', 'إجراءات الحساب'),
        'noAccounts' => $n::t('No accounts yet', 'لا توجد حسابات بعد'),
        'noAccountsText' => $n::t('Add the first account to start the chart.', 'أضف أول حساب لبدء الدليل.'),
        'expand' => $n::t('Expand', 'توسيع'),
        'collapse' => $n::t('Collapse', 'طي'),
        'archived' => $n::t('Archived', 'مؤرشف'),
        'viewStatement' => $n::t('View statement', 'عرض كشف الحساب'),
        'addChild' => $n::t('Add sub-account', 'إضافة حساب فرعي'),
        'archive' => $n::t('Archive account', 'أرشفة الحساب'),
        'restore' => $n::t('Restore account', 'استعادة الحساب'),
        'asset' => $n::t('Asset', 'أصول'),
        'liability' => $n::t('Liability', 'التزامات'),
        'equity' => $n::t('Equity', 'حقوق ملكية'),
        'revenue' => $n::t('Revenue', 'إيرادات'),
        'expense' => $n::t('Expense', 'مصروفات'),
    ];
    $strings = array_merge($strings, $labels);
    $config = [
        'accounts' => array_values((array) $accounts), 'entries' => array_values((array) $entries), 'currency' => strtoupper($currency ?? $n::currency(app()->getLocale())),
        'locale' => $n::rtl() ? 'ar' : 'en', 'selectedId' => $selectedId, 't' => $strings,
    ];
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $thNum = 'px-3 py-2 text-end text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $tdNum = 'px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums';
    $types = ['asset' => 'info', 'liability' => 'warning', 'equity' => 'neutral', 'revenue' => 'success', 'expense' => 'danger'];
    $hasMenu = $canSelect || $canAddChild || $canArchive;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'chart-of-accounts') }}" x-data="nqAccountingChart(@js($config))" {{ $attributes->except('data-slot')->cn('w-full min-w-0') }}>
    <template x-if="accounts.length === 0">
        <x-nq::states.empty icon="list-tree" :title="$strings['noAccounts']" :description="$strings['noAccountsText']" />
    </template>
    <div x-show="accounts.length > 0" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
        <div role="table" class="table w-full min-w-[32rem] border-collapse">
            <div role="caption" class="sr-only">{{ $strings['chart'] }}</div>
            <div role="rowgroup" class="table-header-group border-b border-border">
                <div role="row" class="table-row">
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $strings['account'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }} w-28">{{ $strings['type'] }}</div>
                    <div role="columnheader" dir="ltr" class="table-cell {{ $thNum }} w-36">{{ $strings['balance'] }}</div>
                    <div role="columnheader" class="table-cell w-10"><span class="sr-only">{{ $strings['rowActions'] }}</span></div>
                </div>
            </div>
            <div role="rowgroup" class="table-row-group divide-y divide-border">
                <template x-for="r in tree" :key="r.account.id">
                    <div role="row" data-slot="account-row" x-data="nqContextMenu()" x-bind="trigger" x-show="!isHidden(r.account)"
                        x-bind:data-selected="selectedId === r.account.id ? '' : null" x-bind:class="r.account.archived ? 'opacity-60' : ''"
                        class="table-row data-[selected]:bg-nq-hover">
                        <div role="cell" class="table-cell {{ $td }}">
                            <div class="flex items-center gap-2" x-bind:style="`padding-inline-start: ${r.depth * 1.25}rem`">
                                <x-nq::button variant="ghost" size="icon-sm" x-show="r.hasChildren" x-bind:aria-expanded="isCollapsed(r.account.id) ? 'false' : 'true'"
                                    x-bind:aria-label="(isCollapsed(r.account.id) ? t.expand : t.collapse) + ', ' + r.account.name" x-on:click="toggle(r.account.id)">
                                    <x-lucide-chevron-down aria-hidden="true" class="transition-transform" x-bind:class="isCollapsed(r.account.id) ? '-rotate-90 rtl:rotate-90' : ''" />
                                </x-nq::button>
                                <span x-show="!r.hasChildren" aria-hidden="true" class="size-control-sm shrink-0"></span>
                                <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground" x-text="r.account.code"></bdi>
                                @if ($canSelect)
                                    <button type="button" class="min-w-0 truncate text-start hover:underline" x-bind:class="r.hasChildren ? 'font-medium' : ''" x-on:click="select(r.account)" x-text="r.account.name"></button>
                                @else
                                    <span class="min-w-0 truncate" x-bind:class="r.hasChildren ? 'font-medium' : ''" x-text="r.account.name"></span>
                                @endif
                                <x-nq::badge variant="outline" x-show="r.account.archived">{{ $strings['archived'] }}</x-nq::badge>
                            </div>
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            @foreach ($types as $type => $variant)
                                <x-nq::badge variant="{{ $variant }}" x-show="r.account.type === '{{ $type }}'">{{ $strings[$type] }}</x-nq::badge>
                            @endforeach
                        </div>
                        <div role="cell" dir="ltr" class="table-cell {{ $tdNum }}" x-text="balanceOf(r.account.id)"></div>
                        <div role="cell" class="table-cell px-1">
                            @if ($hasMenu)
                                <x-nq::dropdown-menu>
                                    <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" data-slot="line-item-actions" class="text-muted-foreground"
                                        x-bind:aria-label="t.rowActions + ', ' + r.account.name">
                                        <x-lucide-ellipsis aria-hidden="true" />
                                    </x-nq::dropdown-menu.trigger>
                                    <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                        @if ($canSelect || $canAddChild)
                                            <x-nq::dropdown-menu.group>
                                                @if ($canSelect)<x-nq::dropdown-menu.item x-on:click="select(r.account)"><x-lucide-list-tree aria-hidden="true" />{{ $strings['viewStatement'] }}</x-nq::dropdown-menu.item>@endif
                                                @if ($canAddChild)<x-nq::dropdown-menu.item x-on:click="addChild(r.account)"><x-lucide-folder-plus aria-hidden="true" />{{ $strings['addChild'] }}</x-nq::dropdown-menu.item>@endif
                                            </x-nq::dropdown-menu.group>
                                        @endif
                                        @if ($canArchive)
                                            @if ($canSelect || $canAddChild)<x-nq::dropdown-menu.separator />@endif
                                            <x-nq::dropdown-menu.group>
                                                <x-nq::dropdown-menu.item variant="danger" x-on:click="toggleArchive(r.account)"><x-lucide-archive aria-hidden="true" /><span x-text="archiveLabel(r.account)">{{ $strings['archive'] }}</span></x-nq::dropdown-menu.item>
                                            </x-nq::dropdown-menu.group>
                                        @endif
                                    </x-nq::dropdown-menu.content>
                                </x-nq::dropdown-menu>
                            @endif
                        </div>
                        @if ($hasMenu)
                            <template x-teleport="body">
                                <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                                    class="fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                    @if ($canSelect)<x-nq::context-menu.item x-on:click="select(r.account)"><x-lucide-list-tree aria-hidden="true" />{{ $strings['viewStatement'] }}</x-nq::context-menu.item>@endif
                                    @if ($canAddChild)<x-nq::context-menu.item x-on:click="addChild(r.account)"><x-lucide-folder-plus aria-hidden="true" />{{ $strings['addChild'] }}</x-nq::context-menu.item>@endif
                                    @if ($canArchive)
                                        @if ($canSelect || $canAddChild)<x-nq::context-menu.separator />@endif
                                        <x-nq::context-menu.item variant="danger" x-on:click="toggleArchive(r.account)"><x-lucide-archive aria-hidden="true" /><span x-text="archiveLabel(r.account)">{{ $strings['archive'] }}</span></x-nq::context-menu.item>
                                    @endif
                                </div>
                            </template>
                        @endif
                    </div>
                </template>
            </div>
        </div>
    </div>
</div>

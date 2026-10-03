{{-- <x-nq::store-settings.gift-cards-manager :cards="$cards" currency="USD" now="2026-09-29T09:00:00" actor="sara@shop.test" />
     Gift cards for the merchant: issue with a generated code (it has a check character), see each card's balance and its full ledger, redeem an amount, add or remove balance by hand and turn a card off.
     The balance is never stored, it is the sum of the ledger. cards: full card arrays as the gift-card logic builds them (id, code, currency, ledger, expiresAt?, disabled?, recipient?).
     Money is minor units. now: an ISO date-time treated as now. currency: USD, or SAR in Arabic. actor: who is acting, written on ledger entries. error / loading: the list states. labels: override any string by key.
     Each row has a menu (open, turn on or off) that also opens on context-click, long-press or the Menu key.
     Issuing fires "nq-giftcard-issue" { card }; redeeming, adjusting and turning off fire "nq-giftcard-update" { card }; each carries waitUntil(promise), resolve(), reject(message).
     Nobody claiming the event applies the change locally; a rejection or a resolved { error } keeps the dialog open and shows the message. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-settings._words')
@props(['cards' => [], 'currency' => null, 'now' => null, 'actor' => null, 'error' => null, 'loading' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_store_settings_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $config = ['cards' => array_values((array) $cards), 'currency' => $code, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en', 'labels' => (array) $labels, 'now' => $now, 'actor' => $actor];
    $id = 'nq-gc-'.substr(md5(json_encode($config['cards'])), 0, 8);
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $hint = 'text-caption text-muted-foreground';
    $th = 'px-3 py-2 text-start text-caption font-medium text-muted-foreground';
    $thNum = 'px-3 py-2 text-end text-caption font-medium text-muted-foreground';
    $td = 'px-3 py-2.5 text-body-sm text-foreground';
    $items = [
        ['icon' => 'gift', 'label' => $t['openCard'], 'on' => 'openDetail(c)'],
        ['icon' => 'power', 'label' => $t['disable'], 'on' => 'setEnabled(c, false)', 'if' => '!c.disabled', 'sep' => true],
        ['icon' => 'power', 'label' => $t['enable'], 'on' => 'setEnabled(c, true)', 'if' => 'c.disabled', 'sep' => true],
    ];
    $cancel = \Nasaq\Nasaq::t('Cancel', 'إلغاء');
    $all = \Nasaq\Nasaq::t('All', 'الكل');
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'gift-cards-manager') }}" aria-labelledby="{{ $id }}" @if ($loading) aria-busy="true" @endif x-data="nqGiftCardsManager(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="{{ $id }}" class="text-h3 text-foreground">{{ $t['giftCards'] }}</h2>
        <x-nq::button type="button" variant="primary" x-on:click="openIssue()"><x-lucide-plus aria-hidden="true" /><span>{{ $t['issueCard'] }}</span></x-nq::button>
    </div>
    <div class="flex flex-wrap items-center gap-2">
        <x-nq::field.input type="search" class="max-w-60" aria-label="{{ $t['searchCards'] }}" placeholder="{{ $t['searchCards'] }}" x-model="query" />
        <x-nq::select value="all" x-model="statusFilter">
            <x-nq::select.trigger aria-label="{{ $t['statusCol'] }}" class="w-40"><x-nq::select.value /></x-nq::select.trigger>
            <x-nq::select.content>
                <x-nq::select.item value="all">{{ $all }}</x-nq::select.item>
                @foreach (['active', 'depleted', 'expired', 'disabled'] as $s)<x-nq::select.item :value="$s">{{ $t['giftStatuses'][$s] }}</x-nq::select.item>@endforeach
            </x-nq::select.content>
        </x-nq::select>
    </div>
    <p x-show="listError" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="listError"></span></p>
    @if ($error)
        <x-nq::states.error :title="$t['loadFailed']" :description="$error" />
    @elseif ($loading)
        <div class="flex flex-col gap-2"><x-nq::states.skeleton class="h-10 w-full" /><x-nq::states.skeleton class="h-10 w-full" /></div>
    @else
        <div x-show="visible.length === 0" @if (count($config['cards']) > 0) style="display: none" @endif><x-nq::states.empty icon="gift" :title="$t['cardsEmpty']" :description="$t['cardsEmptyHint']" class="border-0" /></div>
        <div x-show="visible.length !== 0" @if (count($config['cards']) === 0) style="display: none" @endif data-slot="gift-card-table" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
            <div role="table" aria-label="{{ $t['giftCards'] }}" class="table w-full min-w-[36rem] border-collapse">
                <div role="rowgroup" class="table-header-group border-b border-border">
                    <div role="row" class="table-row">
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['code'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['statusCol'] }}</div>
                        <div role="columnheader" class="table-cell {{ $thNum }}">{{ $t['balance'] }}</div>
                        <div role="columnheader" class="table-cell {{ $thNum }}">{{ $t['issuedValue'] }}</div>
                        <div role="columnheader" class="table-cell {{ $th }}">{{ $t['expires'] }}</div>
                        <div role="columnheader" class="table-cell w-10"></div>
                    </div>
                </div>
                <div role="rowgroup" class="table-row-group divide-y divide-border">
                    <template x-for="c in visible" :key="c.id">
                        <div role="row" data-slot="gift-card-row" x-data="nqContextMenu()" x-bind="trigger" x-bind:data-status="standing(c)" x-on:click="openDetail(c)" class="table-row cursor-pointer">
                            <div role="cell" class="table-cell {{ $td }}"><div class="flex min-w-0 flex-col"><bdi dir="ltr" class="truncate font-mono font-medium" x-text="c.code"></bdi><span x-show="c.recipient && c.recipient.name" class="truncate text-caption text-muted-foreground" x-text="c.recipient ? c.recipient.name : ''"></span></div></div>
                            <div role="cell" class="table-cell {{ $td }}">
                                <span x-show="tone(c) === 'success'" style="display: none"><x-nq::status tone="success"><span x-text="statusText(c)"></span></x-nq::status></span>
                                <span x-show="tone(c) === 'neutral'" style="display: none"><x-nq::status tone="neutral"><span x-text="statusText(c)"></span></x-nq::status></span>
                                <span x-show="tone(c) === 'warning'" style="display: none"><x-nq::status tone="warning"><span x-text="statusText(c)"></span></x-nq::status></span>
                                <span x-show="tone(c) === 'danger'" style="display: none"><x-nq::status tone="danger"><span x-text="statusText(c)"></span></x-nq::status></span>
                            </div>
                            <div role="cell" class="table-cell {{ $td }} text-end font-medium tabular-nums"><bdi dir="ltr" x-text="balanceText(c)"></bdi></div>
                            <div role="cell" class="table-cell {{ $td }} text-end tabular-nums"><bdi dir="ltr" x-text="issuedText(c)"></bdi></div>
                            <div role="cell" class="table-cell {{ $td }}" x-text="expiresText(c)"></div>
                            <div role="cell" class="table-cell px-1" x-on:click.stop>
                                @include('nasaq::components.store-settings._menu', ['items' => $items, 'aria' => '`'.$t['openCard'].', ${c.code}`', 'slotName' => 'gift-card-actions'])
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    @endif

    <x-nq::dialog x-model="issueOpen">
        <x-nq::dialog.content data-slot="gift-card-issue" class="max-w-lg">
            <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="issue()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['issueCard'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['issueHint'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="{{ $label }}"><span>{{ $t['code'] }}</span>
                    <div class="flex gap-2"><x-nq::field.input x-model="code" ltr class="font-mono uppercase" x-bind:aria-invalid="!!codeBad" /><x-nq::button type="button" variant="secondary" x-on:click="regenerate()"><x-lucide-refresh-cw aria-hidden="true" /><span>{{ $t['generate'] }}</span></x-nq::button></div>
                    <span class="{{ $hint }}" x-text="codeHint"></span>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['amount'] }}</span><x-nq::currency-input x-model="amount" :currency="$code" aria-label="{{ $t['amount'] }}" x-bind:aria-invalid="!!amountErr" /></div>
                    <div class="{{ $label }}"><span>{{ $t['expires'] }}</span><x-nq::date-picker x-model="expires" aria-label="{{ $t['expires'] }}" /><span class="{{ $hint }}">{{ $t['expiresHint'] }}</span></div>
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="{{ $label }}"><span>{{ $t['recipientName'] }}</span><x-nq::field.input x-model="name" /></div>
                    <div class="{{ $label }}"><span>{{ $t['recipientEmail'] }}</span><x-nq::field.input type="email" x-model="email" ltr x-bind:aria-invalid="!!emailErr" /></div>
                </div>
                <p x-show="failed" style="display: none" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="failed"></span></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="issueOpen = false"><span>{{ $cancel }}</span></x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:disabled="busy"><span>{{ $t['issueCard'] }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::sheet x-model="detailOpen">
        <x-nq::sheet.content class="w-full sm:max-w-lg">
            <div data-slot="gift-card-detail" class="flex min-h-0 flex-1 flex-col">
                <x-nq::sheet.header>
                    <x-nq::sheet.title class="text-h3"><bdi dir="ltr" class="font-mono" x-text="detail.code"></bdi></x-nq::sheet.title>
                    <x-nq::sheet.description><span x-text="detail.recipient"></span></x-nq::sheet.description>
                </x-nq::sheet.header>
                <x-nq::sheet.body class="flex flex-col gap-5">
                    <dl class="grid grid-cols-2 gap-3 text-body-sm">
                        <div><dt class="{{ $hint }}">{{ $t['balance'] }}</dt><dd class="text-h3 font-semibold"><bdi dir="ltr" x-text="detail.balance"></bdi></dd></div>
                        <div><dt class="{{ $hint }}">{{ $t['issuedValue'] }}</dt><dd><bdi dir="ltr" x-text="detail.issued"></bdi></dd></div>
                        <div><dt class="{{ $hint }}">{{ $t['statusCol'] }}</dt><dd x-text="detail.status"></dd></div>
                        <div><dt class="{{ $hint }}">{{ $t['expires'] }}</dt><dd x-text="detail.expires"></dd></div>
                    </dl>
                    <label class="flex items-center gap-2 text-body-sm"><x-nq::switch x-model="enabledModel" /><span>{{ $t['cardEnabled'] }}</span></label>
                    <p x-show="message" style="display: none" role="status" class="text-body-sm" x-bind:class="messageIsError ? 'text-nq-danger-text' : 'text-nq-success-text'" x-text="message"></p>
                    <div class="flex flex-col gap-2">
                        <h3 class="text-h4 text-foreground">{{ $t['redeem'] }}</h3>
                        <div class="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <div class="{{ $label }}"><span>{{ $t['amount'] }}</span><x-nq::currency-input x-model="redeemAmount" :currency="$code" aria-label="{{ $t['amount'] }}" /></div>
                            <div class="{{ $label }}"><span>{{ $t['orderRef'] }}</span><x-nq::field.input x-model="orderId" ltr /></div>
                            <x-nq::button type="button" variant="secondary" x-bind:disabled="busy" x-on:click="doRedeem()"><span>{{ $t['redeem'] }}</span></x-nq::button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <h3 class="text-h4 text-foreground">{{ $t['adjust'] }}</h3>
                        <div class="grid items-end gap-2 sm:grid-cols-2">
                            <div class="{{ $label }}"><span>{{ $t['direction'] }}</span><x-nq::native-select :options="[['value' => 'add', 'label' => $t['addBalance']], ['value' => 'remove', 'label' => $t['removeBalance']]]" aria-label="{{ $t['direction'] }}" x-model="adjustDir" /></div>
                            <div class="{{ $label }}"><span>{{ $t['amount'] }}</span><x-nq::currency-input x-model="adjustAmount" :currency="$code" aria-label="{{ $t['amount'] }}" /></div>
                        </div>
                        <div class="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
                            <div class="{{ $label }}"><span>{{ $t['note'] }}</span><x-nq::field.input x-model="note" /></div>
                            <x-nq::button type="button" variant="secondary" x-bind:disabled="busy" x-on:click="doAdjust()"><span>{{ $t['adjust'] }}</span></x-nq::button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <h3 class="text-h4 text-foreground">{{ $t['history'] }}</h3>
                        <p x-show="detail.issues" style="display: none" role="alert" class="text-caption text-nq-danger-text"><span>{{ $t['ledgerProblem'] }}</span> <span x-text="detail.issues"></span></p>
                        <ul data-slot="gift-card-ledger" class="divide-y divide-border rounded-card border border-border">
                            <template x-for="e in detail.rows" :key="e.id">
                                <li class="flex items-center justify-between gap-2 px-3 py-2 text-body-sm">
                                    <span class="flex min-w-0 flex-col"><span class="font-medium" x-text="e.kind"></span><span class="truncate text-caption text-muted-foreground"><span x-text="e.at"></span> <span x-text="e.meta"></span></span></span>
                                    <bdi dir="ltr" class="tabular-nums" x-bind:class="e.positive ? 'text-nq-success-text' : 'text-foreground'" x-text="e.sign + e.amount"></bdi>
                                </li>
                            </template>
                        </ul>
                    </div>
                </x-nq::sheet.body>
            </div>
        </x-nq::sheet.content>
    </x-nq::sheet>
</section>

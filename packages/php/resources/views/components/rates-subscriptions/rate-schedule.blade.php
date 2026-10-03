{{-- <x-nq::rates-subscriptions.rate-schedule :rates="$rates" currency="USD" can-add can-remove @nq-rate-add="$event.detail.waitUntil(save($event.detail))" />
     A rate that changes over time: the current rate up front, a history of when each rate started and ended and how much it changed, and an Add rate dialog.
     A new rate applies from its start date and never reprices earlier work. rates: [['id', 'amount' (minor units per hour), 'from' (ISO date)]].
     title: the heading (default "Bill rate"). margin-against: a second schedule, such as cost rates; the margin over it today is shown.
     currency: ISO 4217 code, default USD, or SAR in Arabic. today: ISO date treated as today. can-add / can-remove: show Add rate and the row Remove action (context menu, long-press or Menu key).
     labels: override any built-in string by key. Adding fires "nq-rate-add" { amount, from, waitUntil(promise), resolve(), reject(message) }, removing "nq-rate-remove" { rate, ... };
     nobody claiming the event applies the change locally. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['rates' => [], 'title' => null, 'currency' => null, 'today' => null, 'marginAgainst' => null, 'canAdd' => false, 'canRemove' => false, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $config = [
        'rates' => array_values($rates), 'marginAgainst' => $marginAgainst ? array_values($marginAgainst) : null,
        'currency' => strtoupper($currency ?? $n::currency()), 'locale' => $n::rtl() ? 'ar' : 'en', 'today' => $today ?? \Carbon\Carbon::now()->toDateString(),
        'canAdd' => (bool) $canAdd, 'canRemove' => (bool) $canRemove, 'labels' => (object) $labels,
    ];
    $title ??= $labels['billRate'] ?? $n::t('Bill rate', 'سعر الفوترة');
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'rate-schedule') }}" x-data="nqRateSchedule(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card px-0 py-4 text-card-foreground') }}>
    <x-nq::card.header>
        <x-nq::card.title as="h2">{{ $title }}</x-nq::card.title>
        @if ($canAdd)
            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="openAdd()">
                <x-lucide-plus aria-hidden="true" />
                <span x-text="t.addRate">{{ $n::t('Add a rate', 'إضافة سعر') }}</span>
            </x-nq::button>
        @endif
    </x-nq::card.header>
    <x-nq::card.content x-show="segments.length === 0">
        <x-nq::states.empty icon="calendar-clock" :title="$labels['noRates'] ?? $n::t('No rates yet', 'لا توجد أسعار بعد')" :description="$labels['noRatesHint'] ?? $n::t('Add the first rate to start pricing time.', 'أضف أول سعر لبدء تسعير الوقت.')" class="border-0" />
    </x-nq::card.content>
    <div x-show="segments.length > 0" class="contents">
        <x-nq::card.content class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p x-show="current" class="flex items-baseline gap-1.5">
                <span class="text-h2 font-semibold text-foreground" x-text="current ? money(current.amount) : ''"></span>
                <span class="text-body-sm text-muted-foreground" x-text="t.perHour">{{ $n::t('per hour', 'في الساعة') }}</span>
            </p>
            <x-nq::badge variant="neutral" x-show="margin !== null" x-text="marginText"></x-nq::badge>
            <span x-show="upcoming" class="text-caption text-muted-foreground" x-text="upcoming ? t.futureRate(day(upcoming.from)) : ''"></span>
        </x-nq::card.content>
        <x-nq::card.content>
            <ol class="flex flex-col divide-y divide-border rounded-card border border-border" aria-label="{{ $title }}">
                <template x-for="s in segments" :key="s.rate.id">
                    <li x-data="nqContextMenu()" x-bind="trigger" x-bind:data-current="current && current.id === s.rate.id ? '' : null" class="flex items-center justify-between gap-3 px-3 py-2.5 data-[current]:bg-nq-surface">
                        <div class="flex min-w-0 flex-col gap-0.5">
                            <span class="flex flex-wrap items-center gap-2 text-body-sm text-foreground">
                                <span class="font-medium" x-text="money(s.rate.amount)"></span>
                                <x-nq::status tone="success" x-show="current && current.id === s.rate.id"><span x-text="t.current">{{ $n::t('Current', 'الحالي') }}</span></x-nq::status>
                            </span>
                            <span class="text-caption text-muted-foreground" x-text="day(s.from) + ' – ' + (s.to ? day(s.to) : t.ongoing)"></span>
                        </div>
                        <span x-show="s.changeBps !== null" class="inline-flex items-center gap-1 text-caption" x-bind:class="s.changeBps !== null && s.changeBps >= 0 ? 'text-nq-success-text' : 'text-nq-danger-text'" x-bind:title="s.changeBps !== null ? t.changeFrom(change(s.changeBps)) : ''">
                            <x-lucide-trending-up x-show="s.changeBps !== null && s.changeBps >= 0" aria-hidden="true" class="size-3.5" />
                            <x-lucide-trending-down x-show="s.changeBps !== null && s.changeBps < 0" aria-hidden="true" class="size-3.5" />
                            <bdi dir="ltr" x-text="s.changeBps !== null ? change(s.changeBps) : ''"></bdi>
                            <span class="sr-only" x-text="t.changeFrom('')"></span>
                        </span>
                        @if ($canRemove)
                            <template x-teleport="body">
                                <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open"
                                    class="fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
                                    <x-nq::context-menu.item variant="danger" x-on:click="openRemove(s.rate)"><x-lucide-trash-2 aria-hidden="true" /><span x-text="t.removeRate">{{ $n::t('Remove rate', 'إزالة السعر') }}</span></x-nq::context-menu.item>
                                </div>
                            </template>
                        @endif
                    </li>
                </template>
            </ol>
        </x-nq::card.content>
    </div>
    @if ($canAdd)
        <x-nq::dialog x-model="adding">
            <x-nq::dialog.content data-slot="rate-add" class="max-w-md">
                <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="submit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="t.newRateTitle">{{ $n::t('Add a rate', 'إضافة سعر') }}</span></x-nq::dialog.title>
                        <x-nq::dialog.description><span x-text="t.newRateDescription">{{ $n::t('The new rate applies from its start date. Work before that date keeps the old rate.', 'يسري السعر الجديد من تاريخ بدايته. العمل قبل ذلك التاريخ يحتفظ بالسعر القديم.') }}</span></x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <div class="{{ $label }}">
                        <span x-text="t.amount">{{ $n::t('Amount', 'المبلغ') }}</span>
                        <x-nq::currency-input x-model="amount" :currency="$config['currency']" aria-label="{{ $n::t('Amount', 'المبلغ') }}" x-bind:aria-invalid="amountBad ? 'true' : null" />
                        <p x-show="amountBad" role="alert" class="text-caption text-nq-danger-text" x-text="shownProblem"></p>
                    </div>
                    <div class="{{ $label }}">
                        <span x-text="t.effectiveFrom">{{ $n::t('Effective from', 'ساري من') }}</span>
                        <x-nq::date-picker x-model="from" aria-label="{{ $n::t('Effective from', 'ساري من') }}" />
                        <p x-show="dateBad" role="alert" class="text-caption text-nq-danger-text" x-text="shownProblem"></p>
                    </div>
                    <p x-show="failed" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="failed"></span></p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="adding = false"><span x-text="t.cancel">{{ $n::t('Cancel', 'إلغاء') }}</span></x-nq::button>
                        <x-nq::button type="submit" x-bind:disabled="busy"><span x-text="t.save">{{ $n::t('Save rate', 'حفظ السعر') }}</span></x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
    @if ($canRemove)
        <x-nq::dialog x-model="removing">
            <x-nq::dialog.content data-slot="rate-remove" class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="t.removeTitle">{{ $n::t('Remove this rate?', 'إزالة هذا السعر؟') }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="t.removeDescription">{{ $n::t('Work in that period is priced at the rate before it.', 'يُسعَّر العمل في تلك الفترة بالسعر الذي قبله.') }}</span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <p x-show="failed" role="alert" class="text-body-sm text-nq-danger-text" x-text="failed"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="removing = false"><span x-text="t.cancel">{{ $n::t('Cancel', 'إلغاء') }}</span></x-nq::button>
                    <x-nq::button type="button" variant="danger" x-bind:disabled="busy" x-on:click="confirmRemove()"><span x-text="t.removeRate">{{ $n::t('Remove rate', 'إزالة السعر') }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>

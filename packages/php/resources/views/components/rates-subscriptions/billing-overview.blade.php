{{-- <x-nq::rates-subscriptions.billing-overview :subscriptions="$subs" currency="USD" />
     The organisation's billing at a glance: the monthly recurring total, the active count, what is due in the next 30 days, a split by project and the upcoming charges.
     Only active subscriptions count. subscriptions: as for <x-nq::rates-subscriptions.recurring-subscriptions>. currency: default USD, or SAR in Arabic. today: ISO date treated as today.
     labels: override any built-in string by key. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['subscriptions' => [], 'currency' => null, 'today' => null, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $config = [
        'subscriptions' => array_values($subscriptions), 'currency' => strtoupper($currency ?? $n::currency()), 'locale' => $n::rtl() ? 'ar' : 'en',
        'today' => $today ?? \Carbon\Carbon::now()->toDateString(), 'labels' => (object) $labels,
    ];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'billing-overview') }}" x-data="nqBillingOverview(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <h2 class="text-h3 text-foreground" x-text="t.overview">{{ $labels['overview'] ?? $n::t('Billing overview', 'نظرة عامة على الفوترة') }}</h2>
    <x-nq::stat-card.grid>
        <x-nq::stat-card :label="$labels['mrr'] ?? $n::t('Monthly recurring', 'المتكرر شهريًا')"><span x-text="money(summary.mrr)"></span></x-nq::stat-card>
        <x-nq::stat-card :label="$labels['activeCount'] ?? $n::t('Active subscriptions', 'الاشتراكات النشطة')"><span x-text="num(summary.active)"></span></x-nq::stat-card>
        <x-nq::stat-card :label="$labels['dueSoon'] ?? $n::t('Due in the next 30 days', 'مستحق خلال 30 يومًا')"><span x-text="money(summary.due)"></span></x-nq::stat-card>
    </x-nq::stat-card.grid>
    <div class="grid gap-4 md:grid-cols-2">
        <x-nq::card class="gap-3 px-0">
            <x-nq::card.header><x-nq::card.title as="h3">{{ $labels['byProject'] ?? $n::t('By project', 'حسب المشروع') }}</x-nq::card.title></x-nq::card.header>
            <x-nq::card.content>
                <ul class="flex flex-col gap-2">
                    <template x-for="p in summary.projects" :key="p.id">
                        <li class="flex flex-col gap-1">
                            <span class="flex items-center justify-between gap-3 text-body-sm">
                                <span class="truncate text-foreground" x-text="p.name"></span>
                                <span class="tabular-nums text-muted-foreground" x-text="money(p.monthly)"></span>
                            </span>
                            <span class="h-1.5 overflow-hidden rounded-full bg-nq-surface" aria-hidden="true">
                                <span class="block h-full rounded-full bg-primary" x-bind:style="{ width: share(p.monthly) + '%' }"></span>
                            </span>
                        </li>
                    </template>
                </ul>
            </x-nq::card.content>
        </x-nq::card>
        <x-nq::card class="gap-3 px-0">
            <x-nq::card.header><x-nq::card.title as="h3">{{ $labels['upcoming'] ?? $n::t('Upcoming charges', 'الدفعات القادمة') }}</x-nq::card.title></x-nq::card.header>
            <x-nq::card.content>
                <p x-show="summary.upcoming.length === 0" class="text-body-sm text-muted-foreground" x-text="t.noUpcoming">{{ $labels['noUpcoming'] ?? $n::t('Nothing due in the next 30 days.', 'لا شيء مستحق خلال 30 يومًا.') }}</p>
                <ul x-show="summary.upcoming.length > 0" class="flex flex-col divide-y divide-border">
                    <template x-for="u in summary.upcoming" :key="u.id">
                        <li class="flex items-center justify-between gap-3 py-2 text-body-sm">
                            <span class="flex min-w-0 flex-col">
                                <span class="truncate text-foreground" x-text="u.name"></span>
                                <span class="text-caption text-muted-foreground" x-text="day(u.day)"></span>
                            </span>
                            <span x-text="money(u.amount)"></span>
                        </li>
                    </template>
                </ul>
            </x-nq::card.content>
        </x-nq::card>
    </div>
</section>

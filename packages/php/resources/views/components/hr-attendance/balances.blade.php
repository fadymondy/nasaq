{{-- <x-nq::hr-attendance.balances can-request /> (inside <x-nq::hr-attendance>)
     One card per leave type: days left, a bar of used and pending against the entitlement, and how the type accrues. Approved requests count as used, pending ones as held.
     can-request: a Request leave button on each card, opening <x-nq::hr-attendance.request-dialog /> on that type. loading: skeletons instead of the numbers. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['labels' => []])
@props(['canRequest' => false, 'loading' => false])
@php
    $L = fn ($k, $en, $ar) => data_get($labels, $k) ?? \Nasaq\Nasaq::t($en, $ar);
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'leave-balances') }}" x-id="['balances']" x-bind:aria-labelledby="$id('balances')" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <h2 x-bind:id="$id('balances')" class="text-h3 text-foreground">{{ $L('balances', 'Leave balances', 'أرصدة الإجازات') }}</h2>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <template x-for="b in balances()" x-bind:key="b.id">
            <x-nq::card data-slot="leave-balance" x-bind:data-type="b.id" class="gap-3 px-0">
                <x-nq::card.header>
                    <x-nq::card.title as="h3" class="text-body font-medium"><span x-text="b.name"></span></x-nq::card.title>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-2">
                    @if ($loading)
                        <x-nq::states.skeleton class="h-8 w-24" />
                    @else
                        <p class="flex items-baseline gap-1.5 text-foreground" x-show="b.limited">
                            <span class="text-h2 font-semibold tabular-nums" x-text="b.available"></span>
                            <span class="text-body-sm text-muted-foreground">{{ $L('remaining', 'days left', 'يومًا متبقيًا') }}</span>
                        </p>
                        <p class="flex items-baseline gap-1.5 text-foreground" x-show="!b.limited" style="display: none">
                            <span class="text-h3 font-semibold">{{ $L('unlimited', 'No limit', 'بلا حد') }}</span>
                            <span class="text-body-sm text-muted-foreground" x-text="b.taken"></span>
                        </p>
                    @endif
                    <div data-slot="progress" x-show="b.limited" role="progressbar" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="b.pct" x-bind:aria-valuetext="b.pct + '%'"
                        x-bind:aria-label="b.name + ': ' + t('used')" x-bind:data-tone="b.tone" class="flex w-full flex-col gap-1.5">
                        <div data-slot="progress-track" class="relative block h-1 w-full overflow-hidden rounded-full bg-nq-surface-soft">
                            <div data-slot="progress-indicator" x-bind:style="'inset-inline-start:0;width:' + b.pct + '%'"
                                x-bind:class="b.tone === 'danger' ? 'bg-nq-danger' : 'bg-primary'" class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
                        </div>
                    </div>
                    <dl class="grid grid-cols-3 gap-2 text-caption" x-show="b.limited">
                        <div>
                            <dt class="text-muted-foreground">{{ $L('entitled', 'Entitled', 'الاستحقاق') }}</dt>
                            <dd class="tabular-nums text-foreground" x-text="b.entitled"></dd>
                        </div>
                        <div>
                            <dt class="text-muted-foreground">{{ $L('used', 'Used', 'المستخدم') }}</dt>
                            <dd class="tabular-nums text-foreground" x-text="b.used"></dd>
                        </div>
                        <div>
                            <dt class="text-muted-foreground">{{ $L('pendingDays', 'Pending', 'قيد الموافقة') }}</dt>
                            <dd class="tabular-nums text-foreground" x-text="b.pending"></dd>
                        </div>
                    </dl>
                    <p class="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
                        <span x-show="b.accrues">{{ $L('accrues', 'Earned monthly', 'يُكتسب شهريًا') }}</span>
                        <span x-show="b.carry" x-text="b.carry"></span>
                    </p>
                </x-nq::card.content>
                @if ($canRequest)
                    <x-nq::card.content>
                        <x-nq::button size="sm" x-on:click="openRequest(b.id)" x-bind:aria-label="t('requestLeave') + ': ' + b.name">
                            <x-lucide-plus aria-hidden="true" />
                            {{ $L('requestLeave', 'Request leave', 'طلب إجازة') }}
                        </x-nq::button>
                    </x-nq::card.content>
                @endif
            </x-nq::card>
        </template>
    </div>
</section>

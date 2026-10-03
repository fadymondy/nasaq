{{-- <x-nq::rates-subscriptions.recurring-subscriptions :subscriptions="$subs" currency="USD" :projects="$projects" can-save can-change-status @nq-subscription-save="$event.detail.waitUntil(save($event.detail))" />
     Recurring subscriptions, per project or for the whole organisation: price and quantity, a weekly, monthly or yearly cycle or a custom cron schedule, the next charge
     and the monthly equivalent. Pause, resume, edit and cancel are in each row's context menu (context-click, long-press or the Menu key).
     subscriptions: [['id', 'name', 'projectId', 'projectName', 'amount' (minor units per unit), 'quantity', 'schedule' => ['kind' => 'cycle', 'every', 'unit' => week|month|year] or ['kind' => 'cron', 'expr', 'timeZone'],
     'anchor' (ISO date), 'status' => active|paused|cancelled]]. projects: [['id', 'name']], omit to hide the project field. currency: default USD, or SAR in Arabic. today: ISO date treated as today.
     can-save: show New subscription and the Edit action. can-change-status: show Pause, Resume and Cancel. labels: override any built-in string by key.
     Saving fires "nq-subscription-save" { input, id, waitUntil(promise), resolve(), reject(message) }, a status change "nq-subscription-status" { subscription, status, ... };
     nobody claiming the event applies the change locally. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['subscriptions' => [], 'projects' => null, 'currency' => null, 'today' => null, 'canSave' => false, 'canChangeStatus' => false, 'loading' => false, 'labels' => []])
@php
    $n = \Nasaq\Nasaq::class;
    $config = [
        'subscriptions' => array_values($subscriptions), 'projects' => $projects ? array_values($projects) : null,
        'currency' => strtoupper($currency ?? $n::currency()), 'locale' => $n::rtl() ? 'ar' : 'en', 'today' => $today ?? \Carbon\Carbon::now()->toDateString(),
        'canSave' => (bool) $canSave, 'canChangeStatus' => (bool) $canChangeStatus, 'labels' => (object) $labels,
    ];
    $label = 'flex flex-col gap-1.5 text-label text-foreground';
    $menu = 'fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'recurring-subscriptions') }}" x-data="nqRecurringSubscriptions(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-h3 text-foreground" x-text="t.subscriptions">{{ $labels['subscriptions'] ?? $n::t('Recurring subscriptions', 'الاشتراكات المتكررة') }}</h2>
        @if ($canSave)
            <x-nq::button type="button" size="sm" x-on:click="openEditor()">
                <x-lucide-plus aria-hidden="true" />
                <span x-text="t.newSubscription">{{ $n::t('New subscription', 'اشتراك جديد') }}</span>
            </x-nq::button>
        @endif
    </div>
    <p x-show="listError" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="listError"></span></p>
    <div x-show="subs.length === 0">
        <x-nq::states.empty icon="repeat" :title="$labels['noSubs'] ?? $n::t('No subscriptions', 'لا توجد اشتراكات')" :description="$labels['noSubsHint'] ?? $n::t('Add one to see what renews and when.', 'أضف اشتراكًا لترى ما يتجدد ومتى.')" />
    </div>
    <ul x-show="subs.length > 0" aria-label="{{ $labels['listLabel'] ?? $n::t('Subscriptions', 'الاشتراكات') }}" class="flex flex-col divide-y divide-border rounded-card border border-border">
        <template x-for="s in subs" :key="s.id">
            <li x-data="nqContextMenu()" x-bind="trigger" x-bind:data-status="s.status" x-bind:class="s.status === 'cancelled' ? 'opacity-60' : ''" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3">
                <div class="flex min-w-0 flex-col gap-0.5">
                    <span class="flex flex-wrap items-center gap-2 text-body-sm font-medium text-foreground">
                        <span x-text="s.name"></span>
                        <span x-show="s.quantity && s.quantity > 1" class="text-caption font-normal text-muted-foreground" x-text="s.quantity ? t.quantityShort(num(s.quantity)) : ''"></span>
                        <x-nq::status tone="success" x-show="s.status === 'active'"><span x-text="t.statuses.active"></span></x-nq::status>
                        <x-nq::status tone="warning" x-show="s.status === 'paused'"><span x-text="t.statuses.paused"></span></x-nq::status>
                        <x-nq::status tone="neutral" x-show="s.status === 'cancelled'"><span x-text="t.statuses.cancelled"></span></x-nq::status>
                    </span>
                    <span class="text-caption text-muted-foreground" x-text="(s.projectName || t.orgLevel) + ' · ' + scheduleText(s) + (nextOf(s) ? ' · ' + t.nextCharge + ' ' + day(nextOf(s)) : '')"></span>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-body-sm font-medium text-foreground" x-text="money(total(s))"></span>
                    <span class="text-caption text-muted-foreground" x-text="money(monthly(s)) + ' ' + t.perMonth"></span>
                </div>
                @if ($canSave || $canChangeStatus)
                    <template x-teleport="body">
                        <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" class="{{ $menu }}">
                            @if ($canSave)
                                <x-nq::context-menu.item x-on:click="openEditor(s)"><span x-text="t.edit">{{ $n::t('Edit', 'تعديل') }}</span></x-nq::context-menu.item>
                            @endif
                            @if ($canChangeStatus)
                                <template x-if="s.status === 'active'">
                                    <x-nq::context-menu.item x-on:click="setStatus(s, 'paused')"><x-lucide-pause aria-hidden="true" /><span x-text="t.pause">{{ $n::t('Pause', 'إيقاف مؤقت') }}</span></x-nq::context-menu.item>
                                </template>
                                <template x-if="s.status === 'paused'">
                                    <x-nq::context-menu.item x-on:click="setStatus(s, 'active')"><x-lucide-play aria-hidden="true" /><span x-text="t.resume">{{ $n::t('Resume', 'استئناف') }}</span></x-nq::context-menu.item>
                                </template>
                                <template x-if="s.status !== 'cancelled'">
                                    <x-nq::context-menu.item variant="danger" x-on:click="openCancel(s)"><x-lucide-trash-2 aria-hidden="true" /><span x-text="t.cancelSub">{{ $n::t('Cancel subscription', 'إلغاء الاشتراك') }}</span></x-nq::context-menu.item>
                                </template>
                            @endif
                        </div>
                    </template>
                @endif
            </li>
        </template>
    </ul>
    @if ($canSave)
        <x-nq::dialog x-model="dialogOpen">
            <x-nq::dialog.content data-slot="subscription-editor" class="max-w-lg">
                <form class="flex flex-col gap-4" novalidate x-on:submit.prevent="submit()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="editingId ? t.editSubscription : t.newSubscription">{{ $n::t('New subscription', 'اشتراك جديد') }}</span></x-nq::dialog.title>
                    </x-nq::dialog.header>
                    <div class="{{ $label }}">
                        <span x-text="t.name">{{ $n::t('Name', 'الاسم') }}</span>
                        <x-nq::field.input x-model="name" x-bind:aria-invalid="touched && nameBad ? 'true' : null" />
                    </div>
                    @if ($projects)
                        <div class="{{ $label }}">
                            <span x-text="t.project">{{ $n::t('Project', 'المشروع') }}</span>
                            <x-nq::select value="__none__" x-model="projectId">
                                <x-nq::select.trigger aria-label="{{ $n::t('Project', 'المشروع') }}"><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="__none__">{{ $labels['noProject'] ?? $n::t('No project', 'بدون مشروع') }}</x-nq::select.item>
                                    @foreach ($projects as $p)
                                        <x-nq::select.item :value="$p['id']">{{ $p['name'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </div>
                    @endif
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="{{ $label }}">
                            <span x-text="t.price">{{ $n::t('Price', 'السعر') }}</span>
                            <x-nq::currency-input x-model="amount" :currency="$config['currency']" aria-label="{{ $n::t('Price', 'السعر') }}" x-bind:aria-invalid="touched && amountBad ? 'true' : null" />
                        </div>
                        <div class="{{ $label }}">
                            <span x-text="t.quantity">{{ $n::t('Quantity', 'الكمية') }}</span>
                            <x-nq::field.input x-model="quantity" ltr inputmode="numeric" x-bind:aria-invalid="touched && qtyBad ? 'true' : null" />
                        </div>
                    </div>
                    <label class="flex items-center gap-2 text-body-sm">
                        <x-nq::switch x-model="custom" />
                        <span x-text="t.customSchedule">{{ $n::t('Custom schedule', 'جدول مخصص') }}</span>
                    </label>
                    <div x-show="custom" class="{{ $label }}">
                        <span x-text="t.cron">{{ $n::t('Cron expression', 'تعبير كرون') }}</span>
                        <x-nq::field.input x-model="expr" ltr class="font-mono" x-bind:aria-invalid="touched && scheduleBad ? 'true' : null" />
                        <p x-show="touched && scheduleBad" role="alert" class="text-caption text-nq-danger-text" x-text="t.cronBad"></p>
                        <p x-show="!(touched && scheduleBad)" class="text-caption font-normal text-muted-foreground" x-text="cronText"></p>
                    </div>
                    <div x-show="!custom" class="grid gap-4 sm:grid-cols-2">
                        <div class="{{ $label }}">
                            <span x-text="t.every">{{ $n::t('Every', 'كل') }}</span>
                            <x-nq::field.input x-model="every" ltr inputmode="numeric" x-bind:aria-invalid="touched && scheduleBad ? 'true' : null" />
                        </div>
                        <div class="{{ $label }}">
                            <span x-text="t.repeats">{{ $n::t('Repeats', 'يتكرر') }}</span>
                            <x-nq::select value="month" x-model="unit">
                                <x-nq::select.trigger aria-label="{{ $n::t('Repeats', 'يتكرر') }}"><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="week"><span x-text="unitLabel('week')"></span></x-nq::select.item>
                                    <x-nq::select.item value="month"><span x-text="unitLabel('month')"></span></x-nq::select.item>
                                    <x-nq::select.item value="year"><span x-text="unitLabel('year')"></span></x-nq::select.item>
                                </x-nq::select.content>
                            </x-nq::select>
                        </div>
                    </div>
                    <div class="{{ $label }}">
                        <span x-text="t.firstCharge">{{ $n::t('First charge', 'أول دفعة') }}</span>
                        <x-nq::date-picker x-model="anchor" aria-label="{{ $n::t('First charge', 'أول دفعة') }}" />
                    </div>
                    <p x-show="preview.length > 0" class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                        <span x-text="t.nextCharges">{{ $n::t('Next charges', 'الدفعات القادمة') }}</span>
                        <template x-for="d in preview" :key="d"><x-nq::badge variant="outline"><span x-text="day(d)"></span></x-nq::badge></template>
                    </p>
                    <p x-show="failed" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text"><x-lucide-circle-x aria-hidden="true" class="size-4" /><span x-text="failed"></span></p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="dialogOpen = false"><span x-text="t.cancel">{{ $n::t('Cancel', 'إلغاء') }}</span></x-nq::button>
                        <x-nq::button type="submit" x-bind:disabled="busy"><span x-text="t.save">{{ $n::t('Save', 'حفظ') }}</span></x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
    @if ($canChangeStatus)
        <x-nq::dialog x-model="cancelOpen">
            <x-nq::dialog.content data-slot="subscription-cancel" class="max-w-md">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="t.cancelTitle">{{ $n::t('Cancel this subscription?', 'إلغاء هذا الاشتراك؟') }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="t.cancelDescription(cancelTarget ? cancelTarget.name : '')"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <p x-show="failed" role="alert" class="text-body-sm text-nq-danger-text" x-text="failed"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="cancelOpen = false"><span x-text="t.keep">{{ $n::t('Keep it', 'إبقاؤه') }}</span></x-nq::button>
                    <x-nq::button type="button" variant="danger" x-bind:disabled="busy" x-on:click="confirmCancel()"><span x-text="t.cancelSub">{{ $n::t('Cancel subscription', 'إلغاء الاشتراك') }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</section>

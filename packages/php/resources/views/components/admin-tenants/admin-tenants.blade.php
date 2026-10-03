{{-- <x-nq::admin-tenants :workspaces="$workspaces" :plans="$plans" can-open @change-plan="$event.detail.wait(…)" @set-suspended="$event.detail.wait(…)" />
     The tenants console: stat tiles, then every workspace with its owner, plan, seats and status; change a plan, suspend or reactivate, or open one.
     workspaces: [['id', 'name', 'slug', 'owner' => ['name', 'email'], 'planId', 'status' => active | trial | suspended, 'seatsUsed', 'createdAt', 'trialEndsAt']].
     plans: [['id', 'name', 'priceMonthly', 'currency', 'seats' => int|null]]. page-size (10). hide-stats. loading, error (a message).
     can-change-plan / can-suspend (true) / can-open (false): which row actions to offer. labels: any of the strings below, by key.
     The row menu (and the row's context menu) shows Suspend only on a workspace that is not suspended, Reactivate only on a suspended one.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       change-plan    detail.workspace, detail.planId; resolve, or resolve { error }
       set-suspended  detail.workspace, detail.suspended; resolve, or resolve { error }
       open           detail.workspace
     A rejected promise shows a generic error. After success re-render with the new workspaces. The new plan and seat count come from the rows.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['workspaces' => [], 'plans' => [], 'loading' => false, 'error' => null, 'pageSize' => 10, 'canChangePlan' => true, 'canSuspend' => true, 'canOpen' => false, 'hideStats' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = \Nasaq\Nasaq::rtl();
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? $t::t($en, $arabic);
    $planById = collect($plans)->keyBy('id');
    $currency = $plans[0]['currency'] ?? \Nasaq\Nasaq::currency();
    $stat = fn ($status) => collect($workspaces)->where('status', $status)->count();
    $revenue = collect($workspaces)->where('status', 'active')->sum(fn ($w) => $planById[$w['planId']]['priceMonthly'] ?? 0);
    $fmt = fn ($n) => number_format((float) $n, 0, '.', ',');
    $iso = fn ($v) => $v === null ? null : ($v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : \Carbon\Carbon::parse($v))->toDateString();
    $rows = collect($workspaces)->map(function ($w) use ($planById, $iso, $fmt, $L, $t) {
        $max = $planById[$w['planId']]['seats'] ?? null;
        $used = $fmt($w['seatsUsed']);

        return [
            'id' => $w['id'], 'name' => $w['name'], 'slug' => $w['slug'], 'owner' => $w['owner']['name'], 'email' => $w['owner']['email'],
            'planId' => $w['planId'], 'status' => $w['status'], 'seatsUsed' => $w['seatsUsed'],
            'seats' => $max === null ? str_replace('{used}', $used, $L('seatsUsed', '{used} seats', '{used} مقعد')) : str_replace(['{used}', '{max}'], [$used, $fmt($max)], $L('seatsOf', '{used} of {max} seats', '{used} من {max} مقعد')),
            'createdAt' => $iso($w['createdAt']), 'trialEndsAt' => $w['status'] === 'trial' ? $iso($w['trialEndsAt'] ?? null) : null,
        ];
    })->all();
    $columns = [
        ['id' => 'name', 'header' => $L('workspace', 'Workspace', 'مساحة العمل'), 'sortable' => true, 'searchable' => true, 'hideable' => false],
        ['id' => 'slug', 'header' => $L('slug', 'URL', 'الرابط'), 'searchable' => true, 'hidden' => true],
        ['id' => 'owner', 'header' => $L('owner', 'Owner', 'المالك'), 'sortable' => true, 'searchable' => true],
        ['id' => 'email', 'header' => $L('email', 'Owner email', 'بريد المالك'), 'searchable' => true, 'hidden' => true],
        ['id' => 'planId', 'header' => $L('plan', 'Plan', 'الباقة'), 'type' => 'tag', 'sortable' => true, 'filter' => true, 'options' => collect($plans)->map(fn ($p) => ['value' => $p['id'], 'label' => $p['name'], 'hue' => 'blue'])->all()],
        ['id' => 'seats', 'header' => $L('seats', 'Seats', 'المقاعد')],
        ['id' => 'status', 'header' => $L('status', 'Status', 'الحالة'), 'type' => 'status', 'sortable' => true, 'filter' => true, 'options' => [
            ['value' => 'active', 'label' => $L('statusActive', 'Active', 'نشطة'), 'tone' => 'success'],
            ['value' => 'trial', 'label' => $L('statusTrial', 'Trial', 'تجريبية'), 'tone' => 'info'],
            ['value' => 'suspended', 'label' => $L('statusSuspended', 'Suspended', 'موقوفة'), 'tone' => 'danger'],
        ]],
        ['id' => 'trialEndsAt', 'header' => $L('trialEnds', 'Trial ends', 'تنتهي التجربة'), 'type' => 'date', 'sortable' => true],
        ['id' => 'createdAt', 'header' => $L('created', 'Created', 'تاريخ الإنشاء'), 'type' => 'date', 'sortable' => true, 'align' => 'end'],
    ];
    $actions = array_values(array_filter([
        $canOpen ? ['id' => 'open', 'label' => $L('open', 'Open workspace', 'فتح مساحة العمل'), 'icon' => 'external-link', 'group' => 'manage'] : null,
        $canChangePlan ? ['id' => 'plan', 'label' => $L('changePlan', 'Change plan…', 'تغيير الباقة…'), 'icon' => 'arrow-right-left', 'group' => 'manage'] : null,
        $canSuspend ? ['id' => 'reactivate', 'label' => $L('reactivate', 'Reactivate', 'إعادة التفعيل'), 'icon' => 'circle-play', 'group' => 'danger', 'visibleWhen' => ['field' => 'status', 'eq' => 'suspended']] : null,
        $canSuspend ? ['id' => 'suspend', 'label' => $L('suspend', 'Suspend…', 'إيقاف…'), 'icon' => 'circle-pause', 'danger' => true, 'group' => 'danger', 'visibleWhen' => ['field' => 'status', 'ne' => 'suspended']] : null,
    ]));
    $config = [
        'locale' => $ar ? 'ar' : 'en',
        'plans' => (object) collect($plans)->mapWithKeys(fn ($p) => [(string) $p['id'] => ['name' => $p['name'], 'seats' => $p['seats'] ?? null]])->all(),
        'labels' => [
            'planOk' => $L('planOk', '{name} is now on {plan}.', 'أصبحت {name} على باقة {plan}.'),
            'suspendOk' => $L('suspendOk', '{name} was suspended.', 'تم إيقاف {name}.'),
            'reactivateOk' => $L('reactivateOk', '{name} was reactivated.', 'أُعيد تفعيل {name}.'),
            'failed' => $L('failed', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
            'changeTitle' => $L('changeTitle', 'Change plan for {name}', 'تغيير باقة {name}'),
            'suspendTitle' => $L('suspendTitle', 'Suspend {name}?', 'إيقاف {name}؟'),
            'overSeats' => $L('overSeats', 'This plan allows {max} seats but the workspace uses {used}.', 'تسمح هذه الباقة بـ {max} مقعد بينما تستخدم مساحة العمل {used}.'),
        ],
    ];
    $dismiss = $L('dismiss', 'Dismiss', 'تجاهل');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'admin-workspaces') }}" x-data="nqAdminTenants(@js($config))" x-on:nq-data-table-action="onAction($event)" {{ $attributes->except('data-slot')->cn('flex flex-col gap-5') }}>
    @unless ($hideStats)
        <x-nq::stat-card.grid>
            <x-nq::stat-card :label="$L('total', 'Workspaces', 'مساحات العمل')" :value="count($workspaces)" :loading="$loading"><x-slot:icon><x-lucide-building-2 /></x-slot:icon></x-nq::stat-card>
            <x-nq::stat-card :label="$L('trials', 'On trial', 'تجريبية')" :value="$stat('trial')" :loading="$loading"><x-slot:icon><x-lucide-circle-play /></x-slot:icon></x-nq::stat-card>
            <x-nq::stat-card :label="$L('suspendedStat', 'Suspended', 'موقوفة')" :value="$stat('suspended')" :loading="$loading"><x-slot:icon><x-lucide-circle-pause /></x-slot:icon></x-nq::stat-card>
            <x-nq::stat-card :label="$L('mrr', 'Monthly revenue', 'الإيراد الشهري')" :value="$revenue" :format="['style' => 'currency', 'currency' => $currency, 'maxFraction' => 0]" :loading="$loading" />
        </x-nq::stat-card.grid>
    @endunless
    <template x-if="notice !== null && notice.tone === 'success'">
        <x-nq::alert tone="success" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>
    <template x-if="notice !== null && notice.tone === 'danger'">
        <x-nq::alert tone="danger" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>
    <x-nq::data-table :label="$L('workspaces', 'Workspaces', 'مساحات العمل')" name-key="name" :search="$L('search', 'Search workspace or owner…', 'ابحث بمساحة العمل أو المالك…')"
        :page-size="$pageSize" :columns="$columns" :rows="$rows" :row-actions="$actions" :loading="$loading" :error="$error" />

    <x-nq::dialog x-model="changeOpen">
        <x-nq::dialog.content class="max-w-md">
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="changeTitle"></span></x-nq::dialog.title>
                <x-nq::dialog.description>{{ $L('changeBody', 'The new plan applies at once. Billing is prorated by your payment provider.', 'تسري الباقة الجديدة فورًا. تُحتسب الفوترة تناسبيًا لدى مزوّد الدفع.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <x-nq::field>
                <x-nq::field.label>{{ $L('newPlan', 'New plan', 'الباقة الجديدة') }}</x-nq::field.label>
                <x-nq::select :value="(string) ($plans[0]['id'] ?? '')" x-model="nextPlan">
                    <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($plans as $p)
                            <x-nq::select.item :value="(string) $p['id']">{{ $p['name'] }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
                <p role="alert" x-show="overSeatsText !== ''" x-text="overSeatsText" style="display: none" class="text-caption text-nq-warning-text"></p>
            </x-nq::field>
            <template x-if="dialogError !== null">
                <x-nq::alert tone="danger" role="alert"><span x-text="dialogError"></span></x-nq::alert>
            </template>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="changeOpen = false" x-bind:disabled="busy ? '' : null">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                <x-nq::button type="button" variant="primary" x-on:click="doChange()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy || ! canChange ? '' : null">
                    <x-nq::spinner x-show="busy" style="display: none" />
                    {{ $L('saveChange', 'Change plan', 'تغيير الباقة') }}
                </x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::alert-dialog x-model="suspendOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="suspendTitle"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description>{{ $L('suspendBody', 'Members cannot sign in to this workspace until you reactivate it. Nothing is deleted.', 'لن يستطيع الأعضاء الدخول إلى مساحة العمل حتى تعيد تفعيلها. لا يُحذف أي شيء.') }}</x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <template x-if="dialogError !== null">
                <x-nq::alert tone="danger" role="alert"><span x-text="dialogError"></span></x-nq::alert>
            </template>
            <x-nq::alert-dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="suspendOpen = false" x-bind:disabled="busy ? '' : null">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                <x-nq::button type="button" variant="danger" x-on:click="doSuspend()" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                    <x-nq::spinner x-show="busy" style="display: none" />
                    {{ $L('suspendConfirm', 'Suspend workspace', 'إيقاف مساحة العمل') }}
                </x-nq::button>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>

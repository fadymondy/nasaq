{{-- <x-nq::admin-tenants.plans :plans="$plans" editable @save-plan="$event.detail.wait(…)" />
     The plan catalogue: a card per plan with its price, limits and how many workspaces use it, and a dialog to add or edit a plan.
     plans: [['id', 'name', 'description', 'priceMonthly', 'currency', 'seats' => int|null, 'storageGb' => int|null, 'features' => [], 'visible', 'featured', 'subscribers']].
     editable (false): show New plan / Edit plan and the dialog. currency: default for new plans. labels: any of the strings below, by key.
     Presentational: save-plan fires on the root with detail { plan, wait(promise) }; resolve, or resolve { error }. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['plans' => [], 'editable' => false, 'currency' => null, 'labels' => []])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $currency ??= \Nasaq\Nasaq::currency();
    $fmt = fn ($n) => number_format((float) $n, 0, '.', ',');
    $config = [
        'locale' => $ar ? 'ar' : 'en',
        'currency' => $currency,
        'plans' => (object) collect($plans)->mapWithKeys(fn ($p) => [(string) $p['id'] => [
            'name' => $p['name'], 'seats' => $p['seats'] ?? null, 'description' => $p['description'] ?? '', 'priceMonthly' => $p['priceMonthly'] ?? 0,
            'currency' => $p['currency'] ?? $currency, 'storageGb' => $p['storageGb'] ?? null, 'features' => array_values($p['features'] ?? []),
            'visible' => $p['visible'] ?? true, 'featured' => $p['featured'] ?? false,
        ]])->all(),
        'labels' => [
            'planSavedOk' => $L('planSavedOk', '{name} was saved.', 'تم حفظ {name}.'),
            'planCreatedOk' => $L('planCreatedOk', '{name} was created.', 'تم إنشاء {name}.'),
            'failed' => $L('failed', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
            'editPlanTitle' => $L('editPlanTitle', 'Edit {name}', 'تعديل {name}'),
            'createPlanTitle' => $L('createPlanTitle', 'New plan', 'باقة جديدة'),
            'savePlan' => $L('savePlan', 'Save plan', 'حفظ الباقة'),
            'createPlan' => $L('createPlan', 'Create plan', 'إنشاء الباقة'),
        ],
    ];
    $dismiss = $L('dismiss', 'Dismiss', 'تجاهل');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'admin-plans') }}" x-data="nqAdminTenants(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-5') }}>
    @if ($editable)
        <div class="flex justify-end">
            <x-nq::button type="button" variant="primary" x-on:click="openPlan(null)"><x-lucide-plus />{{ $L('newPlanButton', 'New plan', 'باقة جديدة') }}</x-nq::button>
        </div>
    @endif
    <template x-if="notice !== null && notice.tone === 'success'">
        <x-nq::alert tone="success" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
    </template>
    @if (count($plans) === 0)
        <x-nq::states.empty :title="$L('plansEmpty', 'No plans yet', 'لا توجد باقات بعد')" :description="$L('plansEmptyHint', 'Add a plan to start selling.', 'أضف باقة لتبدأ البيع.')" />
    @else
        <x-nq::plan-card.grid>
            @foreach ($plans as $plan)
                @php
                    $features = [
                        ($plan['seats'] ?? null) === null ? $L('seatsUnlimited', 'Unlimited seats', 'مقاعد غير محدودة') : str_replace('{n}', $fmt($plan['seats']), $L('seatsLimit', 'Up to {n} seats', 'حتى {n} مقعد')),
                        ($plan['storageGb'] ?? null) === null ? $L('storageUnlimited', 'Unlimited storage', 'تخزين غير محدود') : str_replace('{n}', $fmt($plan['storageGb']), $L('storage', '{n} GB storage', '{n} جيجابايت تخزين')),
                        ...array_values($plan['features'] ?? []),
                    ];
                    $hidden = ! ($plan['visible'] ?? true);
                @endphp
                <x-nq::plan-card :name="$plan['name']" :description="$plan['description'] ?? null" :highlighted="(bool) ($plan['featured'] ?? false)" :badge="$hidden ? $L('inactive', 'Hidden', 'مخفية') : null"
                    :price-note="str_replace('{n}', $fmt($plan['subscribers'] ?? 0), $L('subscribers', '{n} workspaces', '{n} مساحة عمل'))" :features="$features">
                    <x-slot:price><x-nq::price size="lg" :amount="$plan['priceMonthly']" :currency="$plan['currency'] ?? $currency" period="month" /></x-slot:price>
                    @if ($editable)
                        <x-slot:action><x-nq::button type="button" variant="secondary" data-plan="{{ $plan['id'] }}" x-on:click="openPlan($el.dataset.plan)"><x-lucide-pencil />{{ $L('editPlan', 'Edit plan', 'تعديل الباقة') }}</x-nq::button></x-slot:action>
                    @endif
                </x-nq::plan-card>
            @endforeach
        </x-nq::plan-card.grid>
    @endif

    @if ($editable)
        <x-nq::dialog x-model="planOpen">
            <x-nq::dialog.content class="max-w-lg">
                <form x-on:submit.prevent="submitPlan()" class="flex flex-col gap-4" novalidate>
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-text="planTitle"></span></x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $L('planBody', 'Name, price and limits. Hidden plans are not offered to new customers.', 'الاسم والسعر والحدود. لا تُعرض الباقات المخفية للعملاء الجدد.') }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <x-nq::field x-model="nameBad">
                        <x-nq::field.label>{{ $L('planName', 'Plan name', 'اسم الباقة') }}</x-nq::field.label>
                        <x-nq::field.input x-model="draft.name" />
                        <x-nq::field.error>{{ $L('nameRequired', 'Enter a plan name.', 'أدخل اسم الباقة.') }}</x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $L('planDescription', 'Description', 'الوصف') }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="draft.description" rows="2" />
                    </x-nq::field>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <x-nq::field x-model="priceBad">
                            <x-nq::field.label>{{ $L('planPrice', 'Monthly price', 'السعر الشهري') }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.price" inputmode="decimal" dir="ltr" />
                            <x-nq::field.error>{{ $L('priceInvalid', 'Enter a price of 0 or more.', 'أدخل سعرًا صفرًا أو أكثر.') }}</x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-model="seatsBad">
                            <x-nq::field.label>{{ $L('planSeats', 'Seats', 'المقاعد') }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.seats" inputmode="numeric" dir="ltr" :placeholder="$L('unlimited', 'Unlimited', 'غير محدود')" />
                            <x-nq::field.error>{{ $L('wholeNumber', 'Enter a whole number or leave empty.', 'أدخل عددًا صحيحًا أو اتركه فارغًا.') }}</x-nq::field.error>
                        </x-nq::field>
                        <x-nq::field x-model="storageBad">
                            <x-nq::field.label>{{ $L('planStorage', 'Storage (GB)', 'التخزين (جيجابايت)') }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.storage" inputmode="numeric" dir="ltr" :placeholder="$L('unlimited', 'Unlimited', 'غير محدود')" />
                            <x-nq::field.error>{{ $L('wholeNumber', 'Enter a whole number or leave empty.', 'أدخل عددًا صحيحًا أو اتركه فارغًا.') }}</x-nq::field.error>
                        </x-nq::field>
                    </div>
                    <label class="flex items-center justify-between gap-3 text-body-sm text-foreground">
                        <span>{{ $L('planVisible', 'Offer this plan to new customers', 'عرض هذه الباقة للعملاء الجدد') }}</span>
                        <x-nq::switch :checked="true" x-model="draft.visible" :aria-label="$L('planVisible', 'Offer this plan to new customers', 'عرض هذه الباقة للعملاء الجدد')" />
                    </label>
                    <x-nq::repeater x-model="draft.features" create-item="{ text: '' }" row-title="item.text || ''" :label="$L('planFeatures', 'Features', 'المزايا')" :add-label="$L('addFeature', 'Add feature', 'إضافة ميزة')" :duplicable="false" :collapsible="false">
                        <x-nq::field.input x-model="item.text" :aria-label="$L('planFeatures', 'Features', 'المزايا')" />
                    </x-nq::repeater>
                    <template x-if="formError !== null">
                        <x-nq::alert tone="danger" role="alert"><span x-text="formError"></span></x-nq::alert>
                    </template>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="planOpen = false" x-bind:disabled="busy ? '' : null">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            <span x-text="planSubmitLabel"></span>
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>

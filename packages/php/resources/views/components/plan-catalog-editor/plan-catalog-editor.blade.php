{{-- <x-nq::plan-catalog-editor :catalog="$catalog" currency="USD" applicable x-on:catalog-apply="$event.detail.wait(fetch(...))" />
     The admin editor for a product catalog: plans (cards and a dialog), features, apps, pay-as-you-go prices and bundles, all edited into a draft.
     Nothing is live until the sync preview, a dry run listing what will be added, updated and removed, is applied.
     catalog: ['apps' => [['id', 'name', 'description', 'enabled']], 'features' => [['id', 'name', 'appId']], 'plans' => [['id', 'name', 'description', 'priceMonthly', 'seats', 'storageGb', 'features', 'visible', 'featured', 'subscribers']],
              'payg' => [['id', 'name', 'unit', 'unitPrice', 'freeUnits']], 'bundles' => [['id', 'name', 'price', 'appIds']]]. The catalog that is live.
     currency: ISO 4217 code for prices (USD, or SAR in Arabic). applicable (false): show the Apply button; without it the preview is read-only. loading: skeleton instead of the tabs.
     labels: any of the strings below, by key. plan-labels: labels of the plan dialog (the same keys as <x-nq::admin-tenants.plans>).
     Persistence is yours. Events on the root (bubbling), each with detail.wait(promise): "catalog-preview" { draft } resolves { changes?, warnings?, error? } (none listening: the editor diffs itself),
     "catalog-apply" { draft } resolves, or resolves { error }; "catalog-change" { draft } after every edit. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['catalog' => [], 'currency' => null, 'applicable' => false, 'loading' => false, 'labels' => [], 'planLabels' => []])
@php
    $currency ??= \Nasaq\Nasaq::currency();
    $T = fn (string $key, string $en, string $ar) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $ar);
    $P = fn (string $key, string $en, string $ar) => $planLabels[$key] ?? \Nasaq\Nasaq::t($en, $ar);
    $dictionary = [
        'tabs' => ['Catalog sections', 'أقسام الكتالوج'],
        'plans' => ['Plans', 'الباقات'],
        'features' => ['Features', 'الميزات'],
        'apps' => ['Apps', 'التطبيقات'],
        'payg' => ['Pay as you go', 'الدفع حسب الاستخدام'],
        'bundles' => ['Bundles', 'الحزم'],
        'unpublished' => ['{n} unpublished changes', '{n} تغييرات غير منشورة'],
        'unpublishedOne' => ['1 unpublished change', 'تغيير واحد غير منشور'],
        'upToDate' => ['The catalog matches what is live.', 'الكتالوج مطابق للنسخة المنشورة.'],
        'review' => ['Review and apply', 'مراجعة وتطبيق'],
        'discard' => ['Discard changes', 'تجاهل التغييرات'],
        'previewTitle' => ['Sync preview', 'معاينة المزامنة'],
        'previewBody' => ['This is a dry run. Nothing goes live until you apply.', 'هذه تجربة بلا أثر. لن يُنشر شيء حتى تضغط تطبيق.'],
        'previewLoading' => ['Checking the changes', 'جارٍ فحص التغييرات'],
        'previewFailed' => ['The preview could not be built. Try again.', 'تعذّر إنشاء المعاينة. حاول مرة أخرى.'],
        'nothing' => ['There is nothing to apply.', 'لا يوجد ما يُطبَّق.'],
        'added' => ['Added', 'مُضاف'],
        'updated' => ['Updated', 'مُعدَّل'],
        'removed' => ['Removed', 'محذوف'],
        'counts' => ['{a} added, {u} updated, {r} removed', '{a} مضاف، {u} معدَّل، {r} محذوف'],
        'fields' => ['Changed', 'المتغيّر'],
        'warnings' => ['Warnings from the dry run', 'تحذيرات من التجربة'],
        'issues' => ['Fix these before applying', 'أصلِح هذه قبل التطبيق'],
        'issueName' => ['{e}: {id} has no name.', '{e}: العنصر {id} بلا اسم.'],
        'issueDuplicate' => ['{e}: the id {id} is used twice.', '{e}: المعرّف {id} مستخدم مرتين.'],
        'issueMissingApp' => ['{e}: {id} points to an app that does not exist.', '{e}: العنصر {id} يشير إلى تطبيق غير موجود.'],
        'cancel' => ['Cancel', 'إلغاء'],
        'apply' => ['Apply {n} changes', 'تطبيق {n} تغييرات'],
        'applyOne' => ['Apply 1 change', 'تطبيق تغيير واحد'],
        'applied' => ['Catalog applied. The changes are live.', 'تم تطبيق الكتالوج. التغييرات منشورة.'],
        'applyFailed' => ['The catalog could not be applied. Nothing was changed.', 'تعذّر تطبيق الكتالوج. لم يتغيّر شيء.'],
        'dismiss' => ['Dismiss', 'تجاهل'],
        'appName' => ['App name', 'اسم التطبيق'],
        'appId' => ['App id', 'معرّف التطبيق'],
        'appEnabled' => ['On sale', 'معروض للبيع'],
        'addApp' => ['Add app', 'إضافة تطبيق'],
        'appsList' => ['Apps', 'التطبيقات'],
        'app' => ['App', 'تطبيق'],
        'featureName' => ['Feature name', 'اسم الميزة'],
        'featureId' => ['Feature key', 'مفتاح الميزة'],
        'featureApp' => ['Belongs to', 'تتبع'],
        'noApp' => ['Whole platform', 'المنصّة كلها'],
        'addFeature' => ['Add feature', 'إضافة ميزة'],
        'featuresList' => ['Features', 'الميزات'],
        'feature' => ['Feature', 'ميزة'],
        'paygName' => ['Meter name', 'اسم العدّاد'],
        'paygId' => ['Meter key', 'مفتاح العدّاد'],
        'paygUnit' => ['Unit', 'الوحدة'],
        'paygPrice' => ['Price per unit', 'السعر للوحدة'],
        'paygFree' => ['Free units per month', 'وحدات مجانية شهريًا'],
        'addPayg' => ['Add price', 'إضافة سعر'],
        'paygList' => ['Pay as you go prices', 'أسعار الدفع حسب الاستخدام'],
        'payg1' => ['Price', 'سعر'],
        'bundleName' => ['Bundle name', 'اسم الحزمة'],
        'bundleId' => ['Bundle id', 'معرّف الحزمة'],
        'bundlePrice' => ['Monthly price', 'السعر الشهري'],
        'includedApps' => ['Included apps', 'التطبيقات المضمّنة'],
        'addBundle' => ['Add bundle', 'إضافة حزمة'],
        'bundlesList' => ['Bundles', 'الحزم'],
        'bundle' => ['Bundle', 'حزمة'],
        'plansHint' => ['Plan changes show up in the sync preview with everything else.', 'تظهر تعديلات الباقات في معاينة المزامنة مع بقية التغييرات.'],
        'empty' => ['Nothing here yet.', 'لا شيء هنا بعد.'],
        'newPlanButton' => ['New plan', 'باقة جديدة'],
        'editPlan' => ['Edit plan', 'تعديل الباقة'],
        'inactive' => ['Hidden', 'مخفية'],
        'subscribers' => ['{n} workspaces', '{n} مساحات عمل'],
        'subscribersOne' => ['1 workspace', 'مساحة عمل واحدة'],
        'storage' => ['{n} GB storage', '{n} جيجابايت تخزين'],
        'storageUnlimited' => ['Unlimited storage', 'تخزين غير محدود'],
        'seatsLimit' => ['Up to {n} seats', 'حتى {n} مقعد'],
        'seatsUnlimited' => ['Unlimited seats', 'مقاعد غير محدودة'],
        'free' => ['Free', 'مجاني'],
        'perMonth' => ['/mo', '/ شهر'],
        'plansEmpty' => ['No plans yet', 'لا توجد باقات بعد'],
        'plansEmptyHint' => ['Add a plan to start selling.', 'أضف باقة لتبدأ البيع.'],
    ];
    $S = [];
    foreach ($dictionary as $key => [$en, $ar]) {
        $S[$key] = $T($key, $en, $ar);
    }
    $L = $P;
    $rows = fn (string $key) => array_values((array) ($catalog[$key] ?? []));
    $data = [
        'apps' => $rows('apps'),
        'features' => $rows('features'),
        'plans' => array_map(fn ($p) => $p + ['features' => [], 'visible' => true, 'subscribers' => 0, 'seats' => null, 'storageGb' => null, 'priceMonthly' => 0], $rows('plans')),
        'payg' => $rows('payg'),
        'bundles' => $rows('bundles'),
    ];
    $config = ['currency' => $currency, 'applicable' => (bool) $applicable, 'labels' => $S];
    $hostConfig = [
        'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en',
        'currency' => $currency,
        'plans' => (object) [],
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
    $dismiss = $S['dismiss'];
    $entities = ['plans', 'features', 'apps', 'payg', 'bundles'];
    $rowTitle = fn (string $kind) => "rowName('{$kind}', item, index)";
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'plan-catalog-editor') }}" x-data="nqPlanCatalogEditor(@js($data), @js($config))" x-on:save-plan="onSavePlan($event)" @if ($loading) aria-busy="true" @endif
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div data-slot="plan-catalog-toolbar" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3">
        <div role="status" class="flex items-center gap-2 text-body-sm">
            <span x-show="hasChanges()" x-cloak style="display: none" class="flex items-center gap-2">
                <x-lucide-pencil aria-hidden="true" class="size-4 text-primary" />
                <span class="text-label text-foreground" x-text="unpublishedText()"></span>
            </span>
            <span x-show="noChanges()" class="text-muted-foreground">{{ $S['upToDate'] }}</span>
        </div>
        <div class="flex items-center gap-2">
            <x-nq::button type="button" variant="ghost" x-bind:disabled="noChanges() ? '' : null" x-on:click="discardAll()"><x-lucide-undo-2 />{{ $S['discard'] }}</x-nq::button>
            <x-nq::button type="button" variant="primary" x-bind:disabled="noChanges() ? '' : null" x-on:click="openReview()"><x-lucide-rocket />{{ $S['review'] }}</x-nq::button>
        </div>
    </div>

    <template x-if="banner !== null">
        <x-nq::alert tone="success" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="banner = null"><span x-text="banner"></span></x-nq::alert>
    </template>

    @if ($loading)
        <div role="status" class="flex flex-col gap-3">
            <x-nq::states.skeleton class="h-8 w-72" />
            <x-nq::states.skeleton class="h-40 w-full" />
        </div>
    @else
        <x-nq::tabs default-value="plans" x-model="section">
            <x-nq::tabs.list variant="underline" :aria-label="$S['tabs']" class="gap-5">
                @foreach ($entities as $entity)
                    <x-nq::tabs.tab :value="$entity">
                        {{ $S[$entity] }}
                        <x-nq::badge variant="brand" x-show="entityHas('{{ $entity }}')" style="display: none" x-bind:aria-label="entityBadge('{{ $entity }}')" x-text="entityCount('{{ $entity }}')" />
                    </x-nq::tabs.tab>
                @endforeach
                <x-nq::tabs.indicator />
            </x-nq::tabs.list>

            <x-nq::tabs.panel value="plans" class="flex flex-col gap-3">
                <p class="text-body-sm text-muted-foreground">{{ $S['plansHint'] }}</p>
                <div data-slot="admin-plans" x-data="nqAdminTenants(@js($hostConfig))" class="flex flex-col gap-5">
                    <div class="flex justify-end">
                        <x-nq::button type="button" variant="primary" x-on:click="editPlan(null, $data)"><x-lucide-plus />{{ $S['newPlanButton'] }}</x-nq::button>
                    </div>
                    <template x-if="notice !== null && notice.tone === 'success'">
                        <x-nq::alert tone="success" dismissible :dismiss-label="$dismiss" x-on:nq:dismiss="notice = null"><span x-text="notice.text"></span></x-nq::alert>
                    </template>
                    <x-nq::states.empty :title="$S['plansEmpty']" :description="$S['plansEmptyHint']" x-show="noPlans()" style="display: none" />
                    <div data-slot="plan-grid" class="@container">
                        <div class="grid grid-cols-1 gap-x-4 gap-y-7 pt-3 @3xl:auto-cols-fr @3xl:grid-flow-col">
                            <template x-for="plan in cat.plans" :key="plan.id">
                                <article data-slot="plan-card" x-bind:data-highlighted="plan.featured ? '' : undefined" x-bind:aria-labelledby="'nq-plan-' + plan.id"
                                    x-bind:class="plan.featured ? 'bg-[color-mix(in_oklab,var(--nq-brand)_9%,var(--nq-surface))] shadow-lg ring-2 ring-nq-brand/50' : 'bg-nq-surface'"
                                    class="relative flex min-w-0 flex-col gap-5 rounded-card p-6">
                                    <span data-slot="plan-card-badge" x-show="planHidden(plan)" style="display: none" x-text="str.inactive"
                                        x-bind:class="plan.featured ? 'border-transparent bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'"
                                        class="absolute -top-3 start-6 inline-flex h-6 items-center rounded-full border px-2.5 text-caption font-medium whitespace-nowrap"></span>
                                    <div class="flex flex-col gap-1">
                                        <h3 x-bind:id="'nq-plan-' + plan.id" class="text-h3 text-foreground" x-text="plan.name"></h3>
                                        <p x-show="plan.description" class="text-body-sm text-muted-foreground" x-text="plan.description"></p>
                                    </div>
                                    <div class="flex flex-col gap-1">
                                        <span data-slot="price" class="inline-flex flex-wrap items-baseline gap-x-1.5 text-body-sm text-foreground">
                                            <span>
                                                <bdi class="text-h2 font-semibold tracking-tight tabular-nums" x-text="planFree(plan) ? str.free : planPrice(plan)"></bdi>
                                                <span x-show="planPaid(plan)" class="text-muted-foreground" x-text="str.perMonth"></span>
                                            </span>
                                        </span>
                                        <p class="text-caption text-muted-foreground" x-text="planNote(plan)"></p>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <x-nq::button type="button" variant="secondary" x-on:click="editPlan(plan.id, $data)"><x-lucide-pencil />{{ $S['editPlan'] }}</x-nq::button>
                                    </div>
                                    <div class="flex flex-col gap-3 border-t border-border pt-5">
                                        <ul class="flex flex-col gap-2.5">
                                            <template x-for="line in planFeatures(plan)" :key="line">
                                                <li data-included class="flex items-start gap-2 text-body-sm text-foreground">
                                                    <x-lucide-check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-brand" />
                                                    <span x-text="line"></span>
                                                </li>
                                            </template>
                                        </ul>
                                    </div>
                                </article>
                            </template>
                        </div>
                    </div>
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
                </div>
            </x-nq::tabs.panel>

            <x-nq::tabs.panel value="features">
                <x-nq::repeater x-model="cat.features" :label="$S['featuresList']" :add-label="$S['addFeature']" create-item="createFeature()" :duplicable="false" :collapsible="false" :row-title="$rowTitle('feature')">
                    <x-slot:empty>{{ $S['empty'] }}</x-slot:empty>
                    <div class="grid gap-3 sm:grid-cols-3">
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['featureName'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="item.name" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['featureId'] }}</x-nq::field.label>
                            <x-nq::field.input ltr x-model.trim="item.id" x-bind:disabled="isLive('features', item.id) ? '' : null" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['featureApp'] }}</x-nq::field.label>
                            <x-nq::select x-model="item.appId">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    <x-nq::select.item value="">{{ $S['noApp'] }}</x-nq::select.item>
                                    <template x-for="a in cat.apps" :key="a.id">
                                        <div data-slot="select-item" x-bind="appOption(a.id)" x-effect="reg(a.id, a.name)"
                                            class="relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50">
                                            <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
                                                <span x-show="isSelected(a.id)" x-cloak class="contents"><x-lucide-check class="size-4" /></span>
                                            </span>
                                            <span data-slot="select-item-text" class="min-w-0 flex-1 truncate" x-text="a.name"></span>
                                        </div>
                                    </template>
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                    </div>
                </x-nq::repeater>
            </x-nq::tabs.panel>

            <x-nq::tabs.panel value="apps">
                <x-nq::repeater x-model="cat.apps" :label="$S['appsList']" :add-label="$S['addApp']" create-item="createApp()" :duplicable="false" :collapsible="false" :row-title="$rowTitle('app')">
                    <x-slot:empty>{{ $S['empty'] }}</x-slot:empty>
                    <div class="grid gap-3 sm:grid-cols-3">
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['appName'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="item.name" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['appId'] }}</x-nq::field.label>
                            <x-nq::field.input ltr x-model.trim="item.id" x-bind:disabled="isLive('apps', item.id) ? '' : null" />
                        </x-nq::field>
                        <x-nq::field class="flex-row items-center justify-between gap-3 self-end rounded-control border border-border px-3 py-2.5">
                            <x-nq::field.label>{{ $S['appEnabled'] }}</x-nq::field.label>
                            <x-nq::switch x-model="item.enabled" :aria-label="$S['appEnabled']" />
                        </x-nq::field>
                    </div>
                </x-nq::repeater>
            </x-nq::tabs.panel>

            <x-nq::tabs.panel value="payg">
                <x-nq::repeater x-model="cat.payg" :label="$S['paygList']" :add-label="$S['addPayg']" create-item="createPayg()" :duplicable="false" :collapsible="false" :row-title="$rowTitle('payg1')">
                    <x-slot:empty>{{ $S['empty'] }}</x-slot:empty>
                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <x-nq::field class="min-w-0 lg:col-span-2">
                            <x-nq::field.label>{{ $S['paygName'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="item.name" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['paygId'] }}</x-nq::field.label>
                            <x-nq::field.input ltr x-model.trim="item.id" x-bind:disabled="isLive('payg', item.id) ? '' : null" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['paygUnit'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="item.unit" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label><span x-text="priceLabel('paygPrice')"></span></x-nq::field.label>
                            <x-nq::field.input ltr type="number" min="0" step="any" x-bind:value="item.unitPrice" x-on:input="setNum(item, 'unitPrice', $event.target.value)" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['paygFree'] }}</x-nq::field.label>
                            <x-nq::field.input ltr type="number" min="0" step="any" x-bind:value="freeText(item)" x-on:input="setFree(item, $event.target.value)" />
                        </x-nq::field>
                    </div>
                </x-nq::repeater>
            </x-nq::tabs.panel>

            <x-nq::tabs.panel value="bundles">
                <x-nq::repeater x-model="cat.bundles" :label="$S['bundlesList']" :add-label="$S['addBundle']" create-item="createBundle()" :duplicable="false" :collapsible="false" :row-title="$rowTitle('bundle')">
                    <x-slot:empty>{{ $S['empty'] }}</x-slot:empty>
                    <div class="grid gap-3 sm:grid-cols-3">
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['bundleName'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="item.name" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label>{{ $S['bundleId'] }}</x-nq::field.label>
                            <x-nq::field.input ltr x-model.trim="item.id" x-bind:disabled="isLive('bundles', item.id) ? '' : null" />
                        </x-nq::field>
                        <x-nq::field class="min-w-0">
                            <x-nq::field.label><span x-text="priceLabel('bundlePrice')"></span></x-nq::field.label>
                            <x-nq::field.input ltr type="number" min="0" step="any" x-bind:value="item.price" x-on:input="setNum(item, 'price', $event.target.value)" />
                        </x-nq::field>
                        <div role="group" aria-label="{{ $S['includedApps'] }}" class="flex flex-col gap-2 sm:col-span-3">
                            <span class="text-label text-foreground">{{ $S['includedApps'] }}</span>
                            <div class="flex flex-wrap gap-x-5 gap-y-2">
                                <template x-for="a in cat.apps" :key="a.id">
                                    <label class="inline-flex items-center gap-2 text-body-sm">
                                        <x-nq::checkbox x-effect="checked = hasApp(item, a.id)" x-on:click="toggleApp(item, a.id)" />
                                        <span x-text="a.name"></span>
                                    </label>
                                </template>
                            </div>
                        </div>
                    </div>
                </x-nq::repeater>
            </x-nq::tabs.panel>
        </x-nq::tabs>
    @endif

    <x-nq::dialog x-model="reviewOpen">
        <x-nq::dialog.content class="max-h-[90dvh] max-w-2xl overflow-y-auto">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $S['previewTitle'] }}</x-nq::dialog.title>
                <x-nq::dialog.description>{{ $S['previewBody'] }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <div data-slot="plan-catalog-preview" class="flex flex-col gap-4">
                <div x-show="previewing" style="display: none" role="status" aria-label="{{ $S['previewLoading'] }}" class="flex flex-col gap-2">
                    <x-nq::states.skeleton class="h-5 w-64" />
                    <x-nq::states.skeleton class="h-16 w-full" />
                </div>
                <template x-if="hasPreviewError()">
                    <x-nq::alert tone="danger"><span x-text="previewError || str.previewFailed"></span></x-nq::alert>
                </template>
                <template x-if="showList()">
                    <div class="flex flex-col gap-4">
                        <p x-show="nothingToShow()" class="text-body-sm text-muted-foreground">{{ $S['nothing'] }}</p>
                        <div x-show="somethingToShow()" style="display: none" class="flex flex-col gap-4">
                            <p data-slot="plan-catalog-counts" class="text-label text-foreground" x-text="countsText()"></p>
                            <ul class="flex flex-col divide-y divide-border rounded-card border border-border">
                                <template x-for="c in shown()" :key="changeKey(c)">
                                    <li x-bind:data-kind="c.kind" class="flex items-start gap-3 px-3 py-2.5 text-body-sm">
                                        <span class="mt-0.5 shrink-0">
                                            <x-lucide-circle-plus x-show="isKind(c, 'added')" aria-hidden="true" class="size-4 text-nq-success-text" />
                                            <x-lucide-trash-2 x-show="isKind(c, 'removed')" aria-hidden="true" class="size-4 text-nq-danger-text" />
                                            <x-lucide-pencil x-show="isKind(c, 'updated')" aria-hidden="true" class="size-4 text-nq-info-text" />
                                        </span>
                                        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span class="flex flex-wrap items-center gap-2">
                                                <span class="text-label text-foreground" x-text="c.name || c.id"></span>
                                                <x-nq::badge variant="success" x-show="isKind(c, 'added')" x-text="str.added" />
                                                <x-nq::badge variant="danger" x-show="isKind(c, 'removed')" x-text="str.removed" />
                                                <x-nq::badge variant="info" x-show="isKind(c, 'updated')" x-text="str.updated" />
                                                <span class="text-caption text-muted-foreground" x-text="str[c.entity]"></span>
                                            </span>
                                            <span x-show="changeHasFields(c)" class="text-caption text-muted-foreground">{{ $S['fields'] }}: <bdi dir="ltr" x-text="changeFields(c)"></bdi></span>
                                        </div>
                                    </li>
                                </template>
                            </ul>
                        </div>
                        <template x-if="hasWarnings()">
                            <x-nq::alert tone="warning" :title="$S['warnings']">
                                <ul class="list-disc ps-4"><template x-for="w in warnings()" :key="w"><li x-text="w"></li></template></ul>
                            </x-nq::alert>
                        </template>
                        <template x-if="hasIssues()">
                            <x-nq::alert tone="danger" :title="$S['issues']" icon="circle-alert">
                                <ul class="list-disc ps-4"><template x-for="i in issues()" :key="i.entity + ':' + i.id + ':' + i.code"><li x-text="issueText(i)"></li></template></ul>
                            </x-nq::alert>
                        </template>
                    </div>
                </template>
                <template x-if="hasApplyError()">
                    <x-nq::alert tone="danger"><span x-text="applyError"></span></x-nq::alert>
                </template>
            </div>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-bind:disabled="applying ? '' : null" x-on:click="closeReview()">{{ $S['cancel'] }}</x-nq::button>
                @if ($applicable)
                    <x-nq::button type="button" variant="primary" x-bind:disabled="applyDisabled() || applying ? '' : null" x-bind:aria-busy="applying ? 'true' : null" x-on:click="applyAll()">
                        <x-nq::spinner x-show="applying" style="display: none" />
                        <span x-text="applyLabel()"></span>
                    </x-nq::button>
                @endif
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>

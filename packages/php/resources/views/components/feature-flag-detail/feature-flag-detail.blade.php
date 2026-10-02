{{-- <x-nq::feature-flag-detail :flag="$flag" :environments="[['id' => 'dev', 'label' => 'Development'], ['id' => 'prod', 'label' => 'Production']]" :fields="[['id' => 'plan', 'label' => 'Plan', 'kind' => 'select', 'options' => [['value' => 'pro', 'label' => 'Pro']]]]" :audit="$audit"
         @toggle="$event.detail.wait(…)" @rollout="…" @rules="…" @variants="…" @kill="…" @restore="…" />
     One flag in full: the kill switch, an on/off switch and a rollout slider per environment, targeting rules built with the rule builder (each serves a variant,
     first match wins), the variants and their weights, and the audit history.
     flag: ['key' => 'new-checkout', 'name' => 'New checkout', 'description' => '', 'killed' => false, 'environments' => ['dev' => ['enabled' => true, 'rollout' => 100]],
            'variants' => [['key' => 'control', 'weight' => 50]], 'rules' => [RuleDefinition…], 'updatedAt' => ISO date, 'updatedBy' => 'Mona'].
     environments: [['id', 'label']] in display order; the last one decides the state badge. fields: what targeting rules can test (the rule builder's fields).
     audit: entries for <x-nq::feature-flag-detail.audit-history> ['id', 'action', 'actor', 'at', 'environment', 'from', 'to', 'reason'].
     toggle, rollout, rules, variants, kill, restore (all true): which controls to show; without one the control is read only or hidden (kill, restore).
     labels: array overriding the built-in words. It is presentational: it fires events on the root; see html/src/alpine/feature-flag-detail.ts.
       toggle    detail.environment, detail.enabled, wait(promise)    rollout   detail.environment, detail.percent, wait(promise)
       rules     detail.rules, wait(promise)                          variants  detail.variants, wait(promise)
       kill      detail.reason, wait(promise)                         restore   wait(promise)
     Each wait promise: resolve, or resolve { error } to show it. A rejection, or nobody listening, shows the generic error and rolls the change back.
     Differences from the React component: the rule builders' "serve variant" choices are the variants at render, not live edits; the variant list and the rules draw after
     Alpine starts. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['flag', 'environments' => [], 'fields' => [], 'audit' => [], 'toggle' => true, 'rollout' => true, 'rules' => true, 'variants' => true, 'kill' => true, 'restore' => true, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $T = fn (string $en, string $arText) => $ar ? $arText : $en;
    $L = fn (string $k, string $en, string $arText) => $labels[$k] ?? $T($en, $arText);
    $flag = (array) $flag;
    $envs = array_values(array_map(fn ($e) => (array) $e, (array) $environments));
    $envIds = array_column($envs, 'id');
    $flagEnvs = (array) ($flag['environments'] ?? []);
    $killed = ! empty($flag['killed']);
    $flagVariants = array_values((array) ($flag['variants'] ?? []));
    $flagRules = array_values((array) ($flag['rules'] ?? []));
    $evaluated = $L('evaluated', 'the flag is evaluated', 'يُقيَّم المفتاح');
    $serve = $L('serve', 'Serve variant', 'تقديم متغيّر');
    $serveOn = $L('serveOn', 'Serve the flag', 'تقديم المفتاح');
    $variantField = $L('variantField', 'Variant', 'المتغيّر');
    $ruleEvents = [['id' => 'evaluate', 'label' => $evaluated]];
    $ruleActionTypes = [count($flagVariants) > 0
        ? ['id' => 'serve', 'label' => $serve, 'fields' => [['name' => 'variant', 'label' => $variantField, 'kind' => 'select', 'required' => true, 'options' => array_map(fn ($v) => ['value' => $v['key'], 'label' => $v['label'] ?? $v['key']], $flagVariants)]], 'defaults' => ['variant' => $flagVariants[0]['key']]]
        : ['id' => 'serve', 'label' => $serveOn]];
    // The headline state is the last environment's, as in the React component.
    $last = $envIds ? $flagEnvs[end($envIds)] ?? ['enabled' => false, 'rollout' => 0] : ['enabled' => false, 'rollout' => 0];
    $state = $killed ? 'killed' : (empty($last['enabled']) || ($last['rollout'] ?? 0) <= 0 ? 'off' : (($last['rollout'] ?? 0) < 100 ? 'partial' : 'on'));
    $stateLabels = [
        'killed' => $L('stateKilled', 'Killed', 'موقوف طارئًا'),
        'on' => $L('stateOn', 'On', 'يعمل'),
        'partial' => $L('statePartial', 'Rolling out', 'إطلاق تدريجي'),
        'off' => $L('stateOff', 'Off', 'متوقف'),
    ];
    $stateTones = ['killed' => 'danger', 'on' => 'success', 'partial' => 'warning', 'off' => 'neutral'];
    $t = [
        'saved' => $L('saved', 'Saved.', 'تم الحفظ.'),
        'failed' => $L('failed', 'Could not save this. Try again.', 'تعذّر الحفظ. حاول مرة أخرى.'),
        'keyInvalid' => $L('keyInvalid', 'Keys are lowercase letters, digits, dots, dashes and underscores.', 'المفاتيح حروف صغيرة وأرقام ونقاط وشرطات.'),
        'keyDuplicate' => $L('keyDuplicate', 'Each key can be used once.', 'يُستخدم كل مفتاح مرة واحدة.'),
        'serve' => $serve, 'serveOn' => $serveOn, 'variantField' => $variantField,
        'rule' => $L('ruleN', 'Rule {n}', 'القاعدة {n}'),
        'moveUp' => $L('moveRuleUp', 'Move rule {n} up', 'نقل القاعدة {n} للأعلى'),
        'moveDown' => $L('moveRuleDown', 'Move rule {n} down', 'نقل القاعدة {n} للأسفل'),
        'removeRule' => $L('removeRuleN', 'Remove rule {n}', 'حذف القاعدة {n}'),
        'removeVariant' => $L('removeVariantK', 'Remove variant {k}', 'حذف المتغيّر {k}'),
    ];
    $config = ['flag' => ['key' => $flag['key'], 'killed' => $killed, 'environments' => (object) $flagEnvs, 'variants' => $flagVariants, 'rules' => $flagRules], 'envs' => $envIds, 'fields' => array_values((array) $fields), 't' => $t];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'feature-flag-detail') }}" x-data="nqFeatureFlagDetail({{ \Illuminate\Support\Js::from($config) }})" {{ $attributes->except('data-slot')->cn('flex w-full flex-col gap-4') }}>
    <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
                <h2 dir="auto" class="text-heading-sm text-foreground">{{ $flag['name'] }}</h2>
                @foreach ($stateLabels as $name => $label)
                    <x-nq::status :tone="$stateTones[$name]" x-show="isState('{{ $name }}')" style="{{ $state !== $name ? 'display: none' : '' }}">{{ $label }}</x-nq::status>
                @endforeach
            </div>
            <bdi dir="ltr" class="font-mono text-caption text-muted-foreground">{{ $flag['key'] }}</bdi>
            @if (! empty($flag['description']))
                <p dir="auto" class="max-w-prose text-body-sm text-muted-foreground">{{ $flag['description'] }}</p>
            @endif
        </div>
        @if ($kill)
            <x-nq::button variant="danger" x-show="! killed" x-on:click="killing = true" style="{{ $killed ? 'display: none' : '' }}">
                <x-lucide-octagon-x aria-hidden="true" />
                {{ $L('kill', 'Kill switch', 'الإيقاف الطارئ') }}
            </x-nq::button>
        @endif
    </div>

    <x-nq::alert tone="danger" :title="$L('killedTitle', 'This flag is killed', 'هذا المفتاح موقوف طارئًا')" x-show="killed" style="{{ $killed ? '' : 'display: none' }}">
        @if ($restore)
            <x-slot:action>
                <x-nq::button size="sm" variant="secondary" x-bind:aria-busy="busy === 'restore' ? 'true' : undefined" x-bind:disabled="busy !== null" x-on:click="restore()">
                    <x-lucide-rotate-ccw aria-hidden="true" />
                    {{ $L('restore', 'Restore', 'استعادة') }}
                </x-nq::button>
            </x-slot:action>
        @endif
        {{ $L('killedBody', 'It is off for everyone in every environment.', 'هو متوقف للجميع في كل البيئات.') }}
    </x-nq::alert>
    <x-nq::alert tone="danger" x-show="noteIs('danger')" style="display: none"><span x-text="note ? note.text : ''"></span></x-nq::alert>
    <x-nq::alert tone="success" x-show="noteIs('success')" style="display: none"><span x-text="note ? note.text : ''"></span></x-nq::alert>

    <x-nq::tabs default-value="environments">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="environments">{{ $L('tabEnvironments', 'Environments', 'البيئات') }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="targeting">{{ $L('tabTargeting', 'Targeting', 'الاستهداف') }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="variants">{{ $L('tabVariants', 'Variants', 'المتغيّرات') }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="history">{{ $L('tabHistory', 'History', 'السجل') }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="environments" class="pt-4">
            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $L('envTitle', 'Environments', 'البيئات') }}</x-nq::card.title>
                    <x-nq::card.description>{{ $L('envDescription', 'Switch the flag per environment and choose how many users get it.', 'شغّل المفتاح لكل بيئة واختر نسبة المستخدمين الذين يحصلون عليه.') }}</x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col divide-y divide-border">
                    @foreach ($envs as $ei => $env)
                        @php
                            $state_ = $flagEnvs[$env['id']] ?? ['enabled' => false, 'rollout' => 0];
                            $rolloutLabel = $labels['rolloutOf'] ?? $T('Rollout in '.$env['label'], 'الإطلاق في '.$env['label']);
                            $lock = $toggle ? "locked({$ei})" : 'true';
                        @endphp
                        <div data-slot="flag-environment" class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-label text-foreground">{{ $env['label'] }}</span>
                                <label class="flex items-center gap-2 text-body-sm text-muted-foreground">
                                    {{ $L('enabled', 'Enabled', 'مفعّل') }}
                                    <x-nq::switch :checked="! empty($state_['enabled'])" x-model="ffOn[cfg.envs[{{ $ei }}]]" aria-label="{{ $env['label'] }}: {{ $L('enabled', 'Enabled', 'مفعّل') }}"
                                        x-bind:disabled="{{ $lock }}" x-bind:data-disabled="{{ $lock }} ? '' : undefined" />
                                </label>
                            </div>
                            <div x-on:pointerup.window="commitRollout(@js($env['id']))" x-on:keyup="commitRollout(@js($env['id']))"
                                @if ($rollout) x-bind:inert="sliderLocked(@js($env['id']))" x-bind:class="sliderLocked(@js($env['id'])) ? 'opacity-50' : ''" @else inert class="opacity-50" @endif>
                                <x-nq::slider :label="$rolloutLabel" :min="0" :max="100" :step="1" :value="$state_['rollout'] ?? 0" :format="['style' => 'unit', 'unit' => 'percent']" x-model="ffRollout[cfg.envs[{{ $ei }}]]" />
                            </div>
                        </div>
                    @endforeach
                    <p class="pt-4 text-caption text-muted-foreground">{{ $L('rolloutHint', 'Users are picked by a stable hash of their id, so raising the percentage keeps the ones who already have it.', 'يُختار المستخدمون بتجزئة ثابتة لمعرّفهم، فرفع النسبة يُبقي من حصلوا عليه سابقًا.') }}</p>
                </x-nq::card.content>
            </x-nq::card>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="targeting" class="pt-4">
            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $L('targetingTitle', 'Targeting rules', 'قواعد الاستهداف') }}</x-nq::card.title>
                    <x-nq::card.description>{{ $L('targetingDescription', 'Serve a variant to specific users. The first rule that matches wins and skips the rollout.', 'قدّم متغيّرًا لمستخدمين محددين. أول قاعدة تنطبق تفوز وتتجاوز الإطلاق.') }}</x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-4">
                    <p x-show="ffRules.length === 0" @if (count($flagRules) > 0) style="display: none" @endif class="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $L('noRules', 'No targeting rules. Everyone follows the rollout.', 'لا قواعد استهداف. الجميع يتبع الإطلاق.') }}</p>
                    <template x-for="(r, ri) in ffRules" x-bind:key="ri">
                        <section x-bind:aria-label="fmt('rule', ri + 1)" data-slot="flag-rule" class="flex flex-col gap-3 rounded-card border border-border p-3">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-label text-foreground" x-text="fmt('rule', ri + 1)"></span>
                                @if ($rules)
                                    <span class="flex items-center">
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="fmt('moveUp', ri + 1)" x-bind:disabled="ri === 0" x-on:click="moveRule(ri, ri - 1)"><x-lucide-arrow-up aria-hidden="true" /></x-nq::button>
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="fmt('moveDown', ri + 1)" x-bind:disabled="ri === ffRules.length - 1" x-on:click="moveRule(ri, ri + 1)"><x-lucide-arrow-down aria-hidden="true" /></x-nq::button>
                                        <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="fmt('removeRule', ri + 1)" x-on:click="removeRule(ri)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    </span>
                                @endif
                            </div>
                            <x-nq::rule-builder :events="$ruleEvents" :fields="$fields" :action-types="$ruleActionTypes" :disabled="! $rules" x-model="ffRules[ri]" />
                        </section>
                    </template>
                    <p x-show="! rulesValid()" style="display: none" role="alert" class="text-body-sm text-danger">{{ $L('fixRules', 'Finish or remove the rules that are incomplete.', 'أكمل القواعد الناقصة أو احذفها.') }}</p>
                </x-nq::card.content>
                @if ($rules)
                    <x-nq::card.footer class="justify-between gap-2">
                        <x-nq::button type="button" variant="secondary" x-on:click="addRule()"><x-lucide-plus aria-hidden="true" />{{ $L('addRule', 'Add rule', 'إضافة قاعدة') }}</x-nq::button>
                        <x-nq::button type="button" variant="primary" x-bind:disabled="rulesLocked()" x-bind:data-disabled="rulesLocked() ? '' : undefined" x-bind:aria-busy="busy === 'rules' ? 'true' : undefined" x-on:click="saveRules()">{{ $L('saveRules', 'Save targeting', 'حفظ الاستهداف') }}</x-nq::button>
                    </x-nq::card.footer>
                @endif
            </x-nq::card>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="variants" class="pt-4">
            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $L('variantsTitle', 'Variants', 'المتغيّرات') }}</x-nq::card.title>
                    <x-nq::card.description>{{ $L('variantsDescription', 'Split the users who get the flag between values. Only the ratio of the weights matters.', 'وزّع المستخدمين الذين يحصلون على المفتاح بين قيم. المهم هو نسبة الأوزان فقط.') }}</x-nq::card.description>
                </x-nq::card.header>
                <x-nq::card.content class="flex flex-col gap-3">
                    <p x-show="ffVariants.length === 0" @if (count($flagVariants) > 0) style="display: none" @endif class="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $L('noVariants', 'No variants: the flag is a plain on/off.', 'لا متغيّرات: المفتاح تشغيل وإيقاف فقط.') }}</p>
                    <template x-for="(v, vi) in ffVariants" x-bind:key="vi">
                        <div data-slot="flag-variant" class="flex flex-wrap items-start gap-3">
                            <x-nq::field class="min-w-40 flex-1">
                                <x-nq::field.label>{{ $L('variantKey', 'Key', 'المفتاح') }}</x-nq::field.label>
                                <x-nq::field.input ltr x-model="v.key" x-bind:data-invalid="keyError(vi) !== null ? '' : undefined" x-bind:aria-invalid="keyError(vi) !== null ? 'true' : undefined" :disabled="! $variants" />
                                <span role="alert" x-show="keyError(vi) !== null" style="display: none" x-text="keyError(vi)" class="text-caption text-danger"></span>
                            </x-nq::field>
                            <x-nq::field class="w-28">
                                <x-nq::field.label>{{ $L('variantWeight', 'Weight', 'الوزن') }}</x-nq::field.label>
                                <x-nq::field.input ltr type="number" min="0" inputmode="numeric" x-model.number="v.weight" :disabled="! $variants" />
                            </x-nq::field>
                            <div class="flex w-20 flex-col gap-1.5">
                                <span class="text-label text-foreground">{{ $L('variantShare', 'Share', 'الحصة') }}</span>
                                <span class="flex h-9 items-center text-body-sm tabular-nums text-muted-foreground" x-text="shareText(vi)"></span>
                            </div>
                            @if ($variants)
                                <x-nq::button type="button" size="icon-sm" variant="ghost" class="mt-6" x-bind:aria-label="fmt('removeVariant', v.key)" x-on:click="removeVariant(vi)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                            @endif
                        </div>
                    </template>
                </x-nq::card.content>
                @if ($variants)
                    <x-nq::card.footer class="justify-between gap-2">
                        <x-nq::button type="button" variant="secondary" x-on:click="addVariant()"><x-lucide-plus aria-hidden="true" />{{ $L('addVariant', 'Add variant', 'إضافة متغيّر') }}</x-nq::button>
                        <x-nq::button type="button" variant="primary" x-bind:disabled="variantsLocked()" x-bind:data-disabled="variantsLocked() ? '' : undefined" x-bind:aria-busy="busy === 'variants' ? 'true' : undefined" x-on:click="saveVariants()">{{ $L('saveVariants', 'Save variants', 'حفظ المتغيّرات') }}</x-nq::button>
                    </x-nq::card.footer>
                @endif
            </x-nq::card>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="history" class="pt-4">
            <x-nq::card>
                <x-nq::card.header>
                    <x-nq::card.title as="h3">{{ $L('historyTitle', 'Audit history', 'سجل التدقيق') }}</x-nq::card.title>
                </x-nq::card.header>
                <x-nq::card.content>
                    <x-nq::feature-flag-detail.audit-history :entries="$audit" :labels="$labels" />
                </x-nq::card.content>
            </x-nq::card>
        </x-nq::tabs.panel>
    </x-nq::tabs>

    @if ($kill)
        <x-nq::alert-dialog x-model="killing">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title>{{ $L('killTitle', 'Kill this flag everywhere?', 'إيقاف هذا المفتاح في كل مكان؟') }}</x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $L('killBody', 'It turns off in every environment at once, whatever the switches and rules say. Turn it back on with Restore.', 'سيتوقف في كل البيئات دفعة واحدة مهما كانت المفاتيح والقواعد. أعده بزر الاستعادة.') }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::field>
                    <x-nq::field.label>{{ $L('reasonLabel', 'Reason (kept in the history)', 'السبب (يُحفظ في السجل)') }}</x-nq::field.label>
                    <x-nq::field.input dir="auto" x-model="ffReason" placeholder="{{ $L('reasonPlaceholder', 'Errors after the last deploy', 'أخطاء بعد آخر نشر') }}" />
                </x-nq::field>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="confirmKill()">{{ $L('killConfirm', 'Kill flag', 'إيقاف المفتاح') }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>

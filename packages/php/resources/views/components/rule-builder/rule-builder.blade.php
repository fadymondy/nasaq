{{-- <x-nq::rule-builder :events="[['id' => 'order.created', 'label' => 'an order is placed']]" :fields="[['id' => 'amount', 'label' => 'Amount', 'kind' => 'number']]"
         :action-types="[['id' => 'email', 'label' => 'Send an email', 'fields' => [['name' => 'to', 'label' => 'To', 'kind' => 'text', 'required' => true]]]]"
         x-on:nq-rule-change="canSave = $event.detail.issues.length === 0" />
     "When this happens, if these are true, then do these": pick the event, build conditions as nested all-of / any-of groups, and stack the actions. A live sentence reads the rule
     back in plain language, and what is still missing is listed. It has no backend: it edits a rule you store and evaluate.
     events: [['id', 'label', 'description']]. fields: [['id', 'label', 'kind' => text | number | select | boolean, 'options' => [['value', 'label']]]].
     action-types: [['id', 'label', 'description', 'fields' => [['name', 'label', 'kind' => text | textarea | number | boolean | select | url | code, 'required', 'placeholder', 'help', 'options']], 'defaults' => []]].
     value: the starting rule ['event' => '', 'conditions' => ['kind' => 'group', 'id' => 'g', 'join' => 'and', 'children' => []], 'actions' => []] (x-modelable as "rule": x-model reads and writes it).
     action-types-from: an Alpine expression in the surrounding scope that returns the action types, for a host that edits them live (the choices follow it); action-types is the starting value. max-depth: how deep condition groups nest (default 3). disabled: read only. Slot: header (under the sentence: a name field, a Save button). labels: override any string
     ({n}, {field}, {join}, {event} stand for the values; sentence and ops are arrays).
     Fires "nq-rule-change" ({ rule, issues }) after every change; issues is empty when nothing is missing. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['events' => [], 'fields' => [], 'actionTypes' => [], 'actionTypesFrom' => null, 'value' => null, 'maxDepth' => 3, 'disabled' => false, 'header' => null, 'labels' => []])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $l = array_replace_recursive([
        'summary' => $T('This rule', 'هذه القاعدة'),
        'when' => $T('When', 'عندما'),
        'whenHelp' => $T('The event that starts the rule.', 'الحدث الذي يبدأ القاعدة.'),
        'chooseEvent' => $T('Choose an event', 'اختر حدثًا'),
        'ifTitle' => $T('If', 'إذا'),
        'ifHelp' => $T('Only continue when these conditions hold. Leave empty to always continue.', 'تابع فقط عندما تتحقق هذه الشروط. اتركها فارغة للمتابعة دائمًا.'),
        'thenTitle' => $T('Then', 'إذن'),
        'thenHelp' => $T('What to do, in order.', 'ما يجب فعله، بالترتيب.'),
        'matchAll' => $T('All of these', 'كل هذه'),
        'matchAny' => $T('Any of these', 'أي من هذه'),
        'match' => $T('Match', 'المطابقة'),
        'addCondition' => $T('Add condition', 'إضافة شرط'),
        'addGroup' => $T('Add group', 'إضافة مجموعة'),
        'removeGroup' => $T('Remove group', 'حذف المجموعة'),
        'removeCondition' => $T('Remove condition', 'حذف الشرط'),
        'groupLabel' => $T('Group: {join}', 'مجموعة: {join}'),
        'noConditions' => $T('No conditions: the rule always continues.', 'لا شروط: تتابع القاعدة دائمًا.'),
        'field' => $T('Field', 'الحقل'),
        'operator' => $T('Operator', 'المعامل'),
        'value' => $T('Value', 'القيمة'),
        'chooseField' => $T('Choose a field', 'اختر حقلًا'),
        'yes' => $T('True', 'صحيح'),
        'no' => $T('False', 'خطأ'),
        'actions' => $T('Actions', 'الإجراءات'),
        'addAction' => $T('Add action', 'إضافة إجراء'),
        'actionType' => $T('Action', 'الإجراء'),
        'chooseAction' => $T('Choose an action', 'اختر إجراءً'),
        'actionRow' => $T('Action {n}', 'الإجراء {n}'),
        'actionsEmpty' => $T('No actions yet.', 'لا إجراءات بعد.'),
        'problems' => $T('{n} to fix', '{n} للإصلاح'),
        'issueEvent' => $T('Choose the event that starts the rule', 'اختر الحدث الذي يبدأ القاعدة'),
        'issueActions' => $T('Add at least one action', 'أضف إجراءً واحدًا على الأقل'),
        'issueField' => $T('A condition has no field', 'شرط بلا حقل'),
        'issueValue' => $T('A condition has no value', 'شرط بلا قيمة'),
        'issueActionField' => $T('An action is missing "{field}"', 'إجراء ينقصه "{field}"'),
        'required' => $T('Required', 'مطلوب'),
        'sentence' => [
            'when' => $T('When {event}', 'عندما {event}'),
            'ifWord' => $T('if', 'وإذا'),
            'then' => $T('then', 'فـ'),
            'noConditions' => $T('always', 'دائمًا'),
            'and' => $T('and', 'و'),
            'or' => $T('or', 'أو'),
        ],
        'ops' => [
            'is' => $T('is', 'يساوي'), 'isNot' => $T('is not', 'لا يساوي'), 'contains' => $T('contains', 'يحتوي'), 'startsWith' => $T('starts with', 'يبدأ بـ'),
            'isEmpty' => $T('is empty', 'فارغ'), 'isNotEmpty' => $T('is not empty', 'غير فارغ'), 'gt' => $T('is greater than', 'أكبر من'), 'gte' => $T('is at least', 'لا يقل عن'),
            'lt' => $T('is less than', 'أصغر من'), 'lte' => $T('is at most', 'لا يزيد عن'),
        ],
    ], (array) $labels);
    $events = array_values((array) $events);
    $fields = array_values((array) $fields);
    $actionTypes = array_values((array) $actionTypes);
    $maxDepth = max(1, (int) $maxDepth);
    $uid = 'nq-rule-'.\Illuminate\Support\Str::random(6);
    $config = [
        'events' => $events, 'fields' => $fields, 'actionTypes' => $actionTypes, 'actionTypesFrom' => $actionTypesFrom, 'value' => $value, 'maxDepth' => $maxDepth, 'disabled' => (bool) $disabled,
        't' => array_intersect_key($l, array_flip(['whenHelp', 'chooseField', 'yes', 'no', 'groupLabel', 'matchAll', 'matchAny', 'actionRow', 'problems', 'issueEvent', 'issueActions', 'issueField', 'issueValue', 'issueActionField', 'sentence', 'ops'])),
    ];
    $control = 'w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]';
    $has = fn ($s) => $s && ! $s->isEmpty();
    $section = 'flex flex-col gap-2 rounded-card border border-border bg-card p-4';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'rule-builder') }}" x-data="nqRuleBuilder(@js($config))" x-modelable="rule" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <section aria-label="{{ $l['summary'] }}" data-slot="rule-summary" class="rounded-card border border-border bg-nq-surface-soft p-4">
        <p class="flex items-start gap-2 text-body text-foreground" aria-live="polite">
            <x-lucide-zap aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-primary" />
            <span dir="auto" x-text="sentence()"></span>
        </p>
        @if ($has($header)) {{ $header }} @endif
    </section>

    <div data-slot="alert" data-tone="warning" role="alert" x-show="messages().length" style="display: none"
        class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border p-3 text-start border-nq-warning/30 bg-nq-warning-soft">
        <x-lucide-circle-alert aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-warning-text" />
        <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5">
            <div data-slot="alert-title" class="text-label text-foreground" x-text="problemsTitle()"></div>
            <div data-slot="alert-description" class="text-body-sm text-muted-foreground">
                <ul class="mt-1 list-disc ps-5 text-body-sm">
                    <template x-for="m in messages()" x-bind:key="m"><li x-text="m"></li></template>
                </ul>
            </div>
        </div>
    </div>

    <section aria-labelledby="{{ $uid }}-when" class="{{ $section }}">
        <div class="flex items-center gap-2">
            <x-nq::badge variant="brand">1</x-nq::badge>
            <h3 id="{{ $uid }}-when" class="text-h4 text-foreground">{{ $l['when'] }}</h3>
        </div>
        <x-nq::field x-model="evInvalid" :disabled="$disabled">
            <x-nq::field.label class="sr-only">{{ $l['when'] }}</x-nq::field.label>
            <x-nq::select x-model="rule.event">
                <x-nq::select.trigger aria-label="{{ $l['when'] }}" x-bind:disabled="disabled">
                    <x-nq::select.value :placeholder="$l['chooseEvent']" />
                </x-nq::select.trigger>
                <x-nq::select.content>
                    @foreach ($events as $e)
                        <x-nq::select.item :value="$e['id']">{{ $e['label'] }}</x-nq::select.item>
                    @endforeach
                </x-nq::select.content>
            </x-nq::select>
            <x-nq::field.description x-text="eventHelp()">{{ $l['whenHelp'] }}</x-nq::field.description>
        </x-nq::field>
    </section>

    <section aria-labelledby="{{ $uid }}-if" class="{{ $section }}">
        <div class="flex items-center gap-2">
            <x-nq::badge variant="brand">2</x-nq::badge>
            <h3 id="{{ $uid }}-if" class="text-h4 text-foreground">{{ $l['ifTitle'] }}</h3>
            <span class="text-caption text-muted-foreground tabular-nums" x-text="conditionCount()">0</span>
        </div>
        <p class="text-body-sm text-muted-foreground">{{ $l['ifHelp'] }}</p>
        <x-nq::rule-builder.group g="rule.conditions" :depth="1" :max-depth="$maxDepth" :l="$l" :control="$control" />
    </section>

    <section aria-labelledby="{{ $uid }}-then" class="{{ $section }}">
        <div class="flex items-center gap-2">
            <x-nq::badge variant="brand">3</x-nq::badge>
            <h3 id="{{ $uid }}-then" class="text-h4 text-foreground">{{ $l['thenTitle'] }}</h3>
        </div>
        <p class="text-body-sm text-muted-foreground">{{ $l['thenHelp'] }}</p>
        <x-nq::repeater :items="[]" x-model="rule.actions" create-item="newAction()" row-title="actionTitle(item, index)" row-label="actionTitle(item, index)"
            :label="$l['actions']" :add-label="$l['addAction']" :disabled="$disabled" :reorderable="true" :duplicable="false" :collapsible="false">
            <x-slot:empty><p class="text-body-sm text-muted-foreground">{{ $l['actionsEmpty'] }}</p></x-slot:empty>
            <div class="flex flex-col gap-4">
                <x-nq::field :disabled="$disabled">
                    <x-nq::field.label>{{ $l['actionType'] }}</x-nq::field.label>
                    <x-nq::select x-model="item.type">
                        <x-nq::select.trigger aria-label="{{ $l['actionType'] }}" x-bind:disabled="disabled">
                            <x-nq::select.value :placeholder="$l['chooseAction']" />
                        </x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($actionTypes as $a)
                                <x-nq::select.item :value="$a['id']">{{ $a['label'] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                    <x-nq::field.description x-show="actionDescription(item)" style="display: none" x-text="actionDescription(item)"></x-nq::field.description>
                </x-nq::field>
                <template x-for="f in actionFields(item)" x-bind:key="f.name">
                    <div>
                        <template x-if="f.isBool">
                            <div class="flex flex-row items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <span class="text-label text-foreground" x-text="f.label"></span>
                                    <p class="text-caption text-muted-foreground" x-show="f.help !== ''" style="display: none" x-text="f.help"></p>
                                </div>
                                <x-nq::switch x-model="item.config[f.name]" x-bind:aria-label="f.label" />
                            </div>
                        </template>
                        <template x-if="! f.isBool">
                            <div class="flex flex-col gap-1.5" x-bind:data-invalid="f.invalid ? '' : null">
                                <label class="text-label text-foreground">
                                    <span x-text="f.label"></span>
                                    <span x-show="f.required" style="display: none" aria-hidden="true" class="ms-1 text-nq-danger-text">*</span>
                                </label>
                                <template x-if="f.isSelect">
                                    <select data-slot="select" x-bind:aria-label="f.label" x-bind:disabled="disabled" x-bind:aria-invalid="f.invalid ? 'true' : null" class="{{ $control }} h-control"
                                        x-on:change="setConfig(item, f.name, $event.target.value)">
                                        <option value="" x-bind:selected="f.text === ''" x-text="f.placeholder"></option>
                                        <template x-for="o in f.options" x-bind:key="o.value"><option x-bind:value="o.value" x-bind:selected="o.value === f.text" x-text="o.label"></option></template>
                                    </select>
                                </template>
                                <template x-if="f.isArea">
                                    <textarea data-slot="textarea" x-bind:rows="f.isCode ? 5 : 3" x-bind:dir="f.isCode ? 'ltr' : null" x-bind:spellcheck="f.isCode ? 'false' : null" x-bind:placeholder="f.placeholder"
                                        x-bind:disabled="disabled" x-bind:aria-invalid="f.invalid ? 'true' : null" class="{{ $control }} min-h-20 py-2" x-bind:class="f.isCode ? 'font-mono text-caption' : ''"
                                        x-bind:value="f.text" x-on:input="setConfig(item, f.name, $event.target.value)"></textarea>
                                </template>
                                <template x-if="f.isInput">
                                    <input data-slot="input" x-bind:type="f.inputType" x-bind:inputmode="f.inputMode || null" x-bind:dir="f.ltr ? 'ltr' : null" x-bind:placeholder="f.placeholder"
                                        x-bind:disabled="disabled" x-bind:aria-invalid="f.invalid ? 'true' : null" class="{{ $control }} h-control" x-bind:value="f.text"
                                        x-on:input="setConfig(item, f.name, $event.target.value, f.kind)">
                                </template>
                                <p class="text-caption text-muted-foreground" x-show="f.help !== ''" style="display: none" x-text="f.help"></p>
                                <div role="alert" class="text-caption text-nq-danger-text" x-show="f.invalid" style="display: none">{{ $l['required'] }}</div>
                            </div>
                        </template>
                    </div>
                </template>
            </div>
        </x-nq::repeater>
    </section>
</div>

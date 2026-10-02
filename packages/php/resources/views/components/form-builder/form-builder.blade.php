{{-- <x-nq::form-builder :form="$definition" form-key="pk_live_123" embed-base-url="https://forms.example.com"
         x-on:nq-form-builder-save="$event.detail.waitUntil(fetch('/api/forms/1', { method: 'PUT', body: JSON.stringify($event.detail.form) }))" />
     Builds a public form: add and order fields in English and Arabic, add rules that show, hide or require fields, choose the sites allowed to embed it
     (closed until you add one), write the thank-you, and copy the embed snippet. The live preview draws the same definition the visitor side
     (<x-nq::public-form>) renders, applies the rules as you answer, and never sends anything.
     form: the FormDefinition being edited { name, kind, fields, rules, allowedOrigins, enabled, thanksEn, thanksAr, honeypot } (nq_pf_contact() gives a contact form).
     form-key: the public key used in the embed snippet and public link. embed-base-url: where public forms are served (https://forms.example.com).
     save-button: show the Save button (true). labels: array overriding the built-in texts (the keys of nq_fb_words()).
     Fires nq-form-builder-change ({ form }) after every edit and nq-form-builder-save ({ form, waitUntil(promise) }) from the Save button, which stays busy until
     the promise settles. Read the edited form from x-data too: it is the form property. The field rows have a context menu (move, duplicate, remove) next to
     their buttons. The preview's choice fields are native selects and radios, because the library select takes static items.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['form' => null, 'formKey' => 'pk_live_demo', 'embedBaseUrl' => 'https://forms.example.com', 'saveButton' => true, 'labels' => []])
@include('nasaq::components.form-builder._logic')
@php
    $t = nq_fb_words((array) $labels);
    $pf = nq_pf_words();
    $rtl = \Nasaq\Nasaq::rtl();
    $def = array_replace([
        'name' => '', 'kind' => 'inquiry', 'fields' => [], 'rules' => [], 'allowedOrigins' => [], 'enabled' => true,
        'thanksEn' => 'Thank you!', 'thanksAr' => 'شكرًا لك!', 'honeypot' => true,
    ], (array) $form);
    $def['fields'] = array_map(fn ($f) => (array) $f, array_values((array) $def['fields']));
    $def['rules'] = array_values((array) $def['rules']);
    $def['allowedOrigins'] = array_values((array) $def['allowedOrigins']);
    $kindList = ['text', 'email', 'phone', 'number', 'textarea', 'select', 'radio', 'checkbox'];
    $wordsEn = nq_fb_words([], false);
    $wordsAr = nq_fb_words([], true);
    $config = [
        'form' => $def, 'formKey' => $formKey, 'embedBaseUrl' => $embedBaseUrl, 'ar' => $rtl, 't' => $t,
        'kindsEn' => $wordsEn['kinds'], 'kindsAr' => $wordsAr['kinds'], 'p' => ['errors' => $pf['errors']],
    ];
    $link = rtrim($embedBaseUrl, '/').'/f/'.$formKey;
    $snippet = nq_fb_snippet($embedBaseUrl, $formKey, 'iframe', $def['name'] ?: 'Form');
    $closed = count($def['allowedOrigins']) === 0;
    $ruleEvents = [['id' => 'change', 'label' => $t['event']]];
    $rowMenu = [['up', 'arrow-up', $t['moveUp'], false], ['down', 'arrow-down', $t['moveDown'], false], ['dup', 'copy', $t['duplicate'], false], ['remove', 'trash-2', $t['remove'], true]];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'form-builder') }}" x-data="nqFormBuilder(@js($config))" {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-end gap-3">
        <x-nq::field class="min-w-48 flex-1">
            <x-nq::field.label>{{ $t['name'] }}</x-nq::field.label>
            <x-nq::field.input x-model="form.name" />
        </x-nq::field>
        <label class="flex items-center gap-2 pb-2 text-body">
            <x-nq::switch :checked="(bool) $def['enabled']" x-model="form.enabled" />
            {{ $t['enabled'] }}
        </label>
        @if ($saveButton)
            <x-nq::button type="button" x-on:click="save()" x-bind:disabled="saving" x-bind:aria-busy="busy()">{{ $t['save'] }}</x-nq::button>
        @endif
    </div>

    <x-nq::tabs default-value="fields">
        <x-nq::tabs.list variant="underline">
            @foreach (['fields', 'logic', 'settings', 'embed'] as $k)
                <x-nq::tabs.tab :value="$k">{{ $t['tabs'][$k] }}</x-nq::tabs.tab>
            @endforeach
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="fields" class="pt-4">
            <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div class="flex min-w-0 flex-col gap-4">
                    <x-nq::select x-model="pick">
                        <x-nq::select.trigger :aria-label="$t['addField']" class="w-full sm:w-64">
                            <x-lucide-plus aria-hidden="true" class="size-4 text-muted-foreground" />
                            <x-nq::select.value :placeholder="$t['addField']" />
                        </x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($kindList as $k)
                                <x-nq::select.item :value="$k">{{ $t['kinds'][$k] }}</x-nq::select.item>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>

                    <p class="text-body-sm text-muted-foreground" x-show="form.fields.length === 0" @if (count($def['fields']) > 0) style="display: none" @endif>{{ $t['noFields'] }}</p>
                    <ul aria-label="{{ $t['fieldList'] }}" class="flex flex-col gap-2" x-show="form.fields.length > 0" @if (count($def['fields']) === 0) style="display: none" @endif>
                        <template x-for="(f, i) in form.fields" :key="f.id">
                            <li data-slot="form-builder-field" x-bind:data-id="f.id"
                                x-bind:class="f.id === selected ? 'border-primary bg-nq-selected' : ''"
                                class="rounded-card border border-border bg-card">
                                <x-nq::context-menu>
                                    <x-nq::context-menu.trigger class="flex items-center gap-2 p-2">
                                        <button type="button" data-field-select x-on:click="choose(f.id)" x-bind:aria-current="f.id === selected ? 'true' : null"
                                            class="flex min-w-0 flex-1 items-center gap-2 rounded-control px-1 py-1 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                                            <span class="truncate font-medium" x-text="shown(f)"></span>
                                            <x-nq::badge variant="outline"><span x-text="kindName(f.kind)"></span></x-nq::badge>
                                            <span class="text-caption text-nq-danger-text" x-show="f.required" style="display: none">{{ $t['required'] }}</span>
                                        </button>
                                        <x-nq::button type="button" variant="ghost" size="icon-sm" :aria-label="$t['moveUp']" x-bind:disabled="i === 0" x-on:click="move(f.id, -1)"><x-lucide-arrow-up aria-hidden="true" /></x-nq::button>
                                        <x-nq::button type="button" variant="ghost" size="icon-sm" :aria-label="$t['moveDown']" x-bind:disabled="i === form.fields.length - 1" x-on:click="move(f.id, 1)"><x-lucide-arrow-down aria-hidden="true" /></x-nq::button>
                                        <x-nq::button type="button" variant="ghost" size="icon-sm" :aria-label="$t['remove']" x-on:click="removeField(f.id)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    </x-nq::context-menu.trigger>
                                    <x-nq::context-menu.content>
                                        @foreach ($rowMenu as [$action, $icon, $text, $danger])
                                            @if ($danger)<x-nq::context-menu.separator />@endif
                                            <x-nq::context-menu.item :variant="$danger ? 'danger' : 'default'" data-action="{{ $action }}" x-bind:data-item-id="f.id" x-on:click="act($el.dataset.action, $el.dataset.itemId)">
                                                <x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />
                                                {{ $text }}
                                            </x-nq::context-menu.item>
                                        @endforeach
                                    </x-nq::context-menu.content>
                                </x-nq::context-menu>
                            </li>
                        </template>
                    </ul>

                    <template x-if="current">
                        <x-nq::card>
                            <x-nq::card.header>
                                <x-nq::card.title as="h3" class="text-body font-medium">{{ $t['editing'] }}</x-nq::card.title>
                            </x-nq::card.header>
                            <x-nq::card.content class="grid gap-4 sm:grid-cols-2">
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t['labelEn'] }}</x-nq::field.label>
                                    <x-nq::field.input x-model="current.label" />
                                </x-nq::field>
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t['labelAr'] }}</x-nq::field.label>
                                    <x-nq::field.input dir="rtl" x-model="current.labelAr" />
                                </x-nq::field>
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t['kind'] }}</x-nq::field.label>
                                    <x-nq::select x-model="kindModel">
                                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                        <x-nq::select.content>
                                            @foreach ($kindList as $k)
                                                <x-nq::select.item :value="$k">{{ $t['kinds'][$k] }}</x-nq::select.item>
                                            @endforeach
                                        </x-nq::select.content>
                                    </x-nq::select>
                                </x-nq::field>
                                <label class="flex items-center gap-2 self-end pb-2 text-body">
                                    <x-nq::switch x-model="current.required" />
                                    {{ $t['isRequired'] }}
                                </label>
                                <template x-if="hasPlaceholder()">
                                    <x-nq::field>
                                        <x-nq::field.label>{{ $t['placeholder'] }}</x-nq::field.label>
                                        <x-nq::field.input x-model="current.placeholder" />
                                    </x-nq::field>
                                </template>
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t['help'] }}</x-nq::field.label>
                                    <x-nq::field.input x-model="current.help" />
                                </x-nq::field>
                                <template x-if="hasOptions()">
                                    <x-nq::field class="sm:col-span-2">
                                        <x-nq::field.label>{{ $t['options'] }}</x-nq::field.label>
                                        <x-nq::field.textarea rows="4" x-model="optionsText" />
                                        <x-nq::field.description>{{ $t['optionsHint'] }}</x-nq::field.description>
                                    </x-nq::field>
                                </template>
                            </x-nq::card.content>
                        </x-nq::card>
                    </template>
                </div>

                <aside aria-label="{{ $t['preview'] }}" class="min-w-0">
                    <x-nq::card>
                        <x-nq::card.header>
                            <x-nq::card.title as="h3" class="text-body font-medium">{{ $t['preview'] }}</x-nq::card.title>
                        </x-nq::card.header>
                        <x-nq::card.content>
                            <form data-slot="public-form" data-kind="preview" novalidate x-on:submit.prevent="previewSubmit()" class="relative flex w-full flex-col gap-4">
                                <div x-show="! done" class="flex flex-col gap-4">
                                    <template x-for="f in form.fields" :key="f.id">
                                        <div data-slot="field" x-bind:data-field="f.id" x-show="visible(f.id)" x-on:input="clearPreview(f.id)" x-on:change="clearPreview(f.id)" class="flex flex-col gap-1.5">
                                            <template x-if="f.kind === 'checkbox'">
                                                <label class="flex items-start gap-2 text-body">
                                                    <x-nq::checkbox x-model="answers[f.id]" class="mt-1" />
                                                    <span x-text="label(f)"></span>
                                                </label>
                                            </template>
                                            <template x-if="f.kind !== 'checkbox'">
                                                <span data-slot="field-label" class="text-label text-foreground">
                                                    <span x-text="label(f)"></span>
                                                    <span class="ms-1 font-normal text-muted-foreground" x-show="! needed(f.id)">({{ $pf['optional'] }})</span>
                                                </span>
                                            </template>
                                            <template x-if="f.kind === 'textarea'">
                                                <x-nq::field.textarea rows="4" x-bind:placeholder="hold(f)" x-model="answers[f.id]" />
                                            </template>
                                            <template x-if="f.kind === 'select'">
                                                <select x-model="answers[f.id]" class="h-control w-full rounded-control border border-input bg-card px-3 text-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                                                    <option value="">{{ $pf['choose'] }}</option>
                                                    <template x-for="o in f.options" :key="o.value"><option x-bind:value="o.value" x-text="optLabel(o)"></option></template>
                                                </select>
                                            </template>
                                            <template x-if="f.kind === 'radio'">
                                                <div role="radiogroup" class="flex flex-col gap-2">
                                                    <template x-for="o in f.options" :key="o.value">
                                                        <label class="flex items-center gap-2 text-body">
                                                            <input type="radio" x-bind:name="f.id" x-bind:value="o.value" x-model="answers[f.id]" class="size-4 accent-[var(--nq-action)]">
                                                            <span x-text="optLabel(o)"></span>
                                                        </label>
                                                    </template>
                                                </div>
                                            </template>
                                            <template x-if="isPlain(f.kind)">
                                                <x-nq::field.input type="text" x-bind:placeholder="hold(f)" x-bind:dir="dirOf(f)" x-model="answers[f.id]" />
                                            </template>
                                            <p class="text-body-sm text-muted-foreground" x-show="hint(f)" x-text="hint(f)" style="display: none"></p>
                                            <p data-slot="field-error" role="alert" class="text-body-sm text-nq-danger-text" x-show="problem(f.id)" x-text="problem(f.id)" style="display: none"></p>
                                        </div>
                                    </template>
                                    <div class="flex flex-wrap items-center gap-3">
                                        <x-nq::button type="submit">{{ $pf['submit'] }}</x-nq::button>
                                        <span class="text-caption text-muted-foreground">{{ $pf['preview'] }}</span>
                                    </div>
                                </div>
                                <div data-slot="public-form-done" role="status" x-show="done" style="display: none" class="flex flex-col items-start gap-3 rounded-card border border-border bg-card p-5">
                                    <x-lucide-circle-check class="size-6 text-nq-success" aria-hidden="true" />
                                    <p class="text-body" x-text="thanks()"></p>
                                    <x-nq::button type="button" variant="link" class="px-0" x-on:click="previewAgain()">{{ $pf['another'] }}</x-nq::button>
                                </div>
                            </form>
                        </x-nq::card.content>
                    </x-nq::card>
                </aside>
            </div>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="logic" class="flex flex-col gap-4 pt-4">
            <p class="text-body-sm text-muted-foreground">{{ $t['logicIntro'] }}</p>
            <p class="text-body-sm text-muted-foreground" x-show="form.fields.length === 0" @if (count($def['fields']) > 0) style="display: none" @endif>{{ $t['ruleFieldsMissing'] }}</p>
            <p class="text-body-sm text-muted-foreground" x-show="noRules()" @if (count($def['rules']) > 0 || count($def['fields']) === 0) style="display: none" @endif>{{ $t['noRules'] }}</p>
            <template x-for="(rule, i) in form.rules" :key="i">
                <x-nq::card>
                    <x-nq::card.header class="flex-row items-center justify-between gap-2">
                        <x-nq::card.title as="h3" class="text-body font-medium"><span x-text="ruleTitle(i)"></span></x-nq::card.title>
                        <x-nq::button type="button" variant="ghost" size="sm" x-on:click="removeRule(i)">
                            <x-lucide-trash-2 aria-hidden="true" />
                            {{ $t['removeRule'] }}
                        </x-nq::button>
                    </x-nq::card.header>
                    <x-nq::card.content>
                        <x-nq::rule-builder :events="$ruleEvents" :fields="[]" :action-types="[]" x-model="form.rules[i]" x-effect="fields = ruleFields(); actionTypes = ruleActionTypes()" />
                    </x-nq::card.content>
                </x-nq::card>
            </template>
            <div x-show="form.fields.length > 0" @if (count($def['fields']) === 0) style="display: none" @endif>
                <x-nq::button type="button" variant="secondary" x-on:click="addRule()">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $t['addRule'] }}
                </x-nq::button>
            </div>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="settings" class="flex max-w-2xl flex-col gap-5 pt-4">
            <x-nq::field x-model="originError">
                <x-nq::field.label>{{ $t['origins'] }}</x-nq::field.label>
                <x-nq::tag-input :value="$def['allowedOrigins']" :placeholder="$t['originsAdd']" dir="ltr" aria-label="{{ $t['origins'] }}"
                    validate="isOrigin(tag) ? true : t.originsInvalid" x-model="form.allowedOrigins" x-on:reject="onReject($event)" />
                <x-nq::field.description>{{ $t['originsHint'] }}</x-nq::field.description>
                <template x-if="closed()"><x-nq::status tone="warning"><span x-text="originsText()"></span></x-nq::status></template>
                <template x-if="! closed()"><x-nq::status tone="success"><span x-text="originsText()"></span></x-nq::status></template>
            </x-nq::field>
            <x-nq::field>
                <x-nq::field.label>{{ $t['originTest'] }}</x-nq::field.label>
                <div class="flex flex-wrap items-center gap-3">
                    <x-nq::field.input ltr x-model="probe" class="max-w-72" placeholder="https://www.example.com" />
                    <template x-if="probeState() === 'allowed'"><x-nq::status tone="success">{{ $t['originTestAllowed'] }}</x-nq::status></template>
                    <template x-if="probeState() === 'blocked'"><x-nq::status tone="danger">{{ $t['originTestBlocked'] }}</x-nq::status></template>
                </div>
            </x-nq::field>
            <x-nq::field>
                <x-nq::field.label>{{ $t['thanksEn'] }}</x-nq::field.label>
                <x-nq::field.textarea rows="2" x-model="form.thanksEn" />
            </x-nq::field>
            <x-nq::field>
                <x-nq::field.label>{{ $t['thanksAr'] }}</x-nq::field.label>
                <x-nq::field.textarea rows="2" dir="rtl" x-model="form.thanksAr" />
            </x-nq::field>
            <x-nq::field>
                <label class="flex items-center gap-2 text-body">
                    <x-nq::switch :checked="(bool) $def['honeypot']" x-model="form.honeypot" />
                    {{ $t['honeypot'] }}
                </label>
                <x-nq::field.description>{{ $t['honeypotHint'] }}</x-nq::field.description>
            </x-nq::field>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="embed" class="flex max-w-2xl flex-col gap-4 pt-4">
            <p class="text-body-sm text-muted-foreground">{{ $t['embedIntro'] }}</p>
            <template x-if="closed()"><x-nq::status tone="warning">{{ $t['embedClosed'] }}</x-nq::status></template>
            <div class="flex gap-2">
                @foreach (['iframe', 'script'] as $k)
                    <x-nq::button type="button" size="sm" variant="secondary" data-style="{{ $k }}" x-on:click="setStyle($el.dataset.style)"
                        x-bind:aria-pressed="pressed($el.dataset.style)" x-bind:data-selected="styleMark($el.dataset.style)"
                        class="data-selected:border-primary data-selected:bg-nq-selected">{{ $t[$k] }}</x-nq::button>
                @endforeach
            </div>
            <x-nq::code-block :code="$snippet" code-expr="snippet()" language="html" />
            <div class="flex items-center gap-2">
                <x-nq::copy-button variant="secondary" :value="$link" value-expr="publicLink()" :label="$t['copyLink']" />
                <bdi dir="ltr" class="truncate text-body-sm text-muted-foreground" x-text="publicLink()">{{ $link }}</bdi>
            </div>
        </x-nq::tabs.panel>
    </x-nq::tabs>
</div>

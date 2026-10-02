{{-- <x-nq::status-page-manager :settings="$settings" :incidents="$incidents" public-url="https://status.example.com" post-incident @save="$event.detail.wait(…)" @post-incident="$event.detail.wait(…)" />
     Admin for the public status page: title, address and domain, which services show and in what order (staged until Save), and posting incidents.
     settings: ['title', 'slug', 'domain', 'services' => [['id', 'name', 'visible']]] in display order. incidents: see <x-nq::uptime-monitors.incident-list>.
     public-url: adds a "View public page" link. post-incident: shows the Post incident button and its dialog.
     It is presentational: it fires events on the root with detail { …, wait(promise) } and your handler talks to the server.
       save           detail.settings { title, slug, domain?, services }; resolve, or resolve { error } shown above the form. After success the staged copy becomes the saved one.
       post-incident  detail.input { title, body, impact: minor | major | maintenance, status: investigating | identified | monitoring | resolved, serviceIds }; resolve, or resolve { error } shown in the dialog.
     A rejected promise, or nobody listening, shows a generic error. labels: array overriding the built-in words.
     Differences from the React component: the incident list is rendered once and does not change with the events. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['settings', 'incidents' => [], 'publicUrl' => null, 'postIncident' => false, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $w = array_merge([
        'title' => $t::t('Status page', 'صفحة الحالة'),
        'description' => $t::t('Choose what customers see on your public status page, and post incidents to it.', 'اختر ما يراه العملاء في صفحة الحالة العامة، وانشر الحوادث عليها.'),
        'view' => $t::t('View public page', 'عرض الصفحة العامة'),
        'settings' => $t::t('Page settings', 'إعدادات الصفحة'),
        'pageTitle' => $t::t('Page title', 'عنوان الصفحة'),
        'slug' => $t::t('Address', 'العنوان'),
        'slugHint' => $t::t('Lowercase letters, numbers and dashes.', 'أحرف إنجليزية صغيرة وأرقام وشرطات.'),
        'slugError' => $t::t('Use lowercase letters, numbers and dashes only.', 'استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.'),
        'domain' => $t::t('Custom domain', 'نطاق مخصص'),
        'domainHint' => $t::t('Optional. Point a CNAME at your status host first.', 'اختياري. وجّه سجل CNAME إلى مضيف الحالة أولًا.'),
        'required' => $t::t('This field is required.', 'هذا الحقل مطلوب.'),
        'services' => $t::t('Services on the page', 'الخدمات في الصفحة'),
        'servicesHint' => $t::t('Turn a service off to hide it. Use the arrows to change the order.', 'أوقف خدمة لإخفائها. استخدم الأسهم لتغيير الترتيب.'),
        'show' => $t::t('Show {name} on the status page', 'إظهار {name} في صفحة الحالة'),
        'up' => $t::t('Move {name} up', 'نقل {name} للأعلى'),
        'down' => $t::t('Move {name} down', 'نقل {name} للأسفل'),
        'save' => $t::t('Save changes', 'حفظ التغييرات'),
        'saved' => $t::t('Saved.', 'تم الحفظ.'),
        'discard' => $t::t('Discard', 'تجاهل'),
        'dirty' => $t::t('Unsaved changes', 'تغييرات غير محفوظة'),
        'post' => $t::t('Post incident', 'نشر حادثة'),
        'dialogTitle' => $t::t('Post an incident', 'نشر حادثة'),
        'dialogBody' => $t::t('It appears on the public page right away. Customers see each update you add.', 'تظهر في الصفحة العامة فورًا. يرى العملاء كل تحديث تضيفه.'),
        'incTitle' => $t::t('Title', 'العنوان'),
        'incBody' => $t::t('What is happening', 'ما الذي يحدث'),
        'incImpact' => $t::t('Impact', 'الأثر'),
        'incStatus' => $t::t('Status', 'الحالة'),
        'incServices' => $t::t('Affected services', 'الخدمات المتأثرة'),
        'publish' => $t::t('Publish', 'نشر'),
        'cancel' => $t::t('Cancel', 'إلغاء'),
        'incidents' => $t::t('Incidents', 'الحوادث'),
        'genericError' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
        'hidden' => $t::t('Hidden', 'مخفية'),
    ], (array) $labels);
    $impact = ['minor' => $t::t('Minor', 'طفيف'), 'major' => $t::t('Major', 'كبير'), 'maintenance' => $t::t('Maintenance', 'صيانة')];
    $statuses = ['investigating' => $t::t('Investigating', 'قيد التحقق'), 'identified' => $t::t('Identified', 'تم تحديد السبب'), 'monitoring' => $t::t('Monitoring', 'تحت المراقبة'), 'resolved' => $t::t('Resolved', 'تم الحل')];
    $services = collect($settings['services'] ?? [])->map(fn ($s) => ['id' => (string) $s['id'], 'name' => $s['name'], 'visible' => (bool) ($s['visible'] ?? true)])->values()->all();
    $config = [
        'settings' => ['title' => $settings['title'] ?? '', 'slug' => $settings['slug'] ?? '', 'domain' => $settings['domain'] ?? '', 'services' => $services],
        'labels' => ['genericError' => $w['genericError'], 'show' => $w['show'], 'up' => $w['up'], 'down' => $w['down']],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'status-page-manager') }}" x-data="nqStatusPageManager(@js($config))"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground w-full') }}>
    <x-nq::card.header>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <x-nq::card.title as="h3">{{ $w['title'] }}</x-nq::card.title>
            <div class="flex items-center gap-2">
                @if ($publicUrl)
                    <x-nq::button variant="ghost" size="sm" :href="$publicUrl" target="_blank" rel="noreferrer"><x-lucide-external-link aria-hidden="true" />{{ $w['view'] }}</x-nq::button>
                @endif
                @if ($postIncident)
                    <x-nq::button variant="primary" size="sm" x-on:click="openIncident()"><x-lucide-megaphone aria-hidden="true" />{{ $w['post'] }}</x-nq::button>
                @endif
            </div>
        </div>
        <x-nq::card.description>{{ $w['description'] }}</x-nq::card.description>
    </x-nq::card.header>
    <x-nq::card.content class="grid gap-6">
        <template x-if="error">
            <x-nq::alert tone="danger" dismissible x-on:nq:dismiss="error = null"><span x-text="error"></span></x-nq::alert>
        </template>
        <template x-if="saved && !dirty">
            <x-nq::alert tone="success">{{ $w['saved'] }}</x-nq::alert>
        </template>

        <section aria-label="{{ $w['settings'] }}" class="grid gap-4 sm:grid-cols-2">
            <x-nq::field x-model="titleInvalid">
                <x-nq::field.label>{{ $w['pageTitle'] }}</x-nq::field.label>
                <x-nq::field.input x-model="draft.title" dir="auto" />
                <x-nq::field.error>{{ $w['required'] }}</x-nq::field.error>
            </x-nq::field>
            <x-nq::field x-model="slugInvalid">
                <x-nq::field.label>{{ $w['slug'] }}</x-nq::field.label>
                <x-nq::field.input x-model="draft.slug" ltr />
                <x-nq::field.description x-show="!slugInvalid">{{ $w['slugHint'] }}</x-nq::field.description>
                <x-nq::field.error>{{ $w['slugError'] }}</x-nq::field.error>
            </x-nq::field>
            <x-nq::field class="sm:col-span-2">
                <x-nq::field.label>{{ $w['domain'] }}</x-nq::field.label>
                <x-nq::field.input x-model="draft.domain" ltr placeholder="status.example.com" />
                <x-nq::field.description>{{ $w['domainHint'] }}</x-nq::field.description>
            </x-nq::field>
        </section>

        <section aria-labelledby="spm-services" class="grid gap-2">
            <div>
                <h4 id="spm-services" class="text-label text-foreground">{{ $w['services'] }}</h4>
                <p class="text-body-sm text-muted-foreground">{{ $w['servicesHint'] }}</p>
            </div>
            <ul class="divide-y divide-border rounded-control border border-border">
                <template x-for="(svc, index) in draft.services" :key="svc.id">
                    <li data-slot="managed-service" class="flex items-center gap-3 px-3 py-2">
                        <x-nq::switch x-model="svc.visible" x-bind:aria-label="showLabel(svc)" />
                        <span class="min-w-0 flex-1 truncate text-body-sm" dir="auto" x-bind:class="svc.visible ? 'text-foreground' : 'text-muted-foreground'" x-text="svc.name"></span>
                        <x-nq::badge variant="neutral" x-show="!svc.visible" style="display: none">{{ $w['hidden'] }}</x-nq::badge>
                        <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="upLabel(svc)" x-bind:disabled="index === 0" x-on:click="move(index, -1)">
                            <x-lucide-arrow-up aria-hidden="true" class="rtl:-scale-x-100" />
                        </x-nq::button>
                        <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="downLabel(svc)" x-bind:disabled="index === draft.services.length - 1" x-on:click="move(index, 1)">
                            <x-lucide-arrow-down aria-hidden="true" />
                        </x-nq::button>
                    </li>
                </template>
            </ul>
        </section>

        <div class="flex items-center justify-end gap-2">
            <span class="me-auto text-body-sm text-muted-foreground" x-show="dirty" style="display: none">{{ $w['dirty'] }}</span>
            <x-nq::button variant="ghost" x-bind:disabled="!dirty || saving" x-on:click="discard()">{{ $w['discard'] }}</x-nq::button>
            <x-nq::button variant="primary" x-bind:disabled="!dirty" x-bind:aria-busy="saving ? 'true' : null" x-on:click="save()">
                <x-nq::spinner x-show="saving" style="display: none" />
                {{ $w['save'] }}
            </x-nq::button>
        </div>

        @if (count($incidents))
            <section aria-labelledby="spm-incidents" class="grid gap-3">
                <h4 id="spm-incidents" class="text-label text-foreground">{{ $w['incidents'] }}</h4>
                <x-nq::uptime-monitors.incident-list :incidents="$incidents" />
            </section>
        @endif
    </x-nq::card.content>

    @if ($postIncident)
        <x-nq::dialog x-model="incOpen">
            <x-nq::dialog.content>
                <form novalidate class="grid gap-4" x-on:submit.prevent="post()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title>{{ $w['dialogTitle'] }}</x-nq::dialog.title>
                        <x-nq::dialog.description>{{ $w['dialogBody'] }}</x-nq::dialog.description>
                    </x-nq::dialog.header>
                    <template x-if="incError"><x-nq::alert tone="danger"><span x-text="incError"></span></x-nq::alert></template>
                    <x-nq::field x-model="incTitleInvalid">
                        <x-nq::field.label>{{ $w['incTitle'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="incTitle" dir="auto" />
                        <x-nq::field.error>{{ $w['required'] }}</x-nq::field.error>
                    </x-nq::field>
                    <x-nq::field x-model="incBodyInvalid">
                        <x-nq::field.label>{{ $w['incBody'] }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="incBody" dir="auto" rows="3" />
                        <x-nq::field.error>{{ $w['required'] }}</x-nq::field.error>
                    </x-nq::field>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field>
                            <x-nq::field.label>{{ $w['incImpact'] }}</x-nq::field.label>
                            <x-nq::select value="minor" x-model="incImpact">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($impact as $k => $label)
                                        <x-nq::select.item :value="$k">{{ $label }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $w['incStatus'] }}</x-nq::field.label>
                            <x-nq::select value="investigating" x-model="incStatus">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($statuses as $k => $label)
                                        <x-nq::select.item :value="$k">{{ $label }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                    </div>
                    <fieldset class="grid gap-2">
                        <legend class="mb-1 text-label text-foreground">{{ $w['incServices'] }}</legend>
                        @foreach ($services as $s)
                            <label class="flex items-center gap-2 text-body-sm">
                                <input type="checkbox" value="{{ $s['id'] }}" x-model="incIds" class="size-4 accent-[var(--nq-brand)]">
                                <span dir="auto">{{ $s['name'] }}</span>
                            </label>
                        @endforeach
                    </fieldset>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="incOpen = false" x-bind:disabled="busy">{{ $w['cancel'] }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                            <x-nq::spinner x-show="busy" style="display: none" />
                            {{ $w['publish'] }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>

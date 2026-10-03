{{-- <x-nq::email-templates :templates="$templates" :variables="$variables" :sender="['name' => 'The team', 'email' => 'hello@example.com']"
         @nq-email-template-save="$event.detail.promise = api.saveTemplate($event.detail.template)" />
     Design the messages your app sends: a searchable gallery of template cards (each with a thumbnail of the rendered email); opening one shows the
     editor with a live preview beside it, at desktop or phone width. Presentational: you own storage and sending. Needs the Alpine runtime (@nasaqScripts).
     templates: [['id', 'name', 'category' (welcome|transactional|marketing|notification), 'status' (draft|active), 'subject', 'preheader', 'body' (HTML), 'dir' (ltr|rtl), 'footer', 'updatedAt']].
     variables: [['key' => 'first_name', 'label' => 'First name', 'sample' => 'Sara']]: {{key}} in the subject, preview text, body and footer is replaced by sample in previews.
     selected-id: open that template in the editor first. sender, recipient: shown in the preview header; recipient is also the default test address.
     can-save, can-duplicate, can-delete, can-send-test (all true): hide those actions. load: a JS expression returning a promise of Tiptap (see rich-text-editor)
     to edit the body as rich text; without it the body is an HTML textarea. labels: override any string of the English table below.
     Events (bubbling): nq-email-template-save { template }, nq-email-template-duplicate { template }, nq-email-template-delete { template },
     nq-email-template-send-test { template, email }. Set event.detail.promise to a Promise (or one resolving to { error }); duplicate may resolve { template } to add the copy.
     Previews render in <iframe sandbox="">, so no script from a body runs. --}}
@props(['templates' => [], 'variables' => [], 'sender' => null, 'recipient' => null, 'selectedId' => null, 'canSave' => true, 'canDuplicate' => true, 'canDelete' => true, 'canSendTest' => true, 'load' => null, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $uid = 'nq-et-'.\Illuminate\Support\Str::random(6);
    $en = [
        'gallery' => 'Email templates', 'search' => 'Search templates…', 'newTemplate' => 'New template', 'untitled' => 'Untitled template', 'all' => 'All',
        'updated' => 'Updated', 'noneTitle' => 'No templates yet', 'noneHint' => 'Create a template to reuse the same message everywhere.',
        'noMatchTitle' => 'No templates match', 'noMatchHint' => 'Try another search or category.', 'duplicate' => 'Duplicate', 'delete' => 'Delete',
        'back' => 'All templates', 'save' => 'Save template', 'saved' => 'Template saved.', 'unsaved' => 'Unsaved changes', 'name' => 'Template name', 'category' => 'Category',
        'subject' => 'Subject', 'preheader' => 'Preview text', 'preheaderHint' => 'The grey line shown after the subject in most inboxes.', 'body' => 'Body', 'direction' => 'Direction',
        'ltr' => 'Left to right', 'rtl' => 'Right to left', 'variables' => 'Variables',
        'variablesHint' => 'Copy a variable and paste it into the subject or the body. It is replaced when the email is sent.',
        'copyVariable' => 'Copy {key}', 'unknown' => 'Unknown variables: {keys}', 'edit' => 'Edit', 'preview' => 'Preview', 'desktop' => 'Desktop', 'mobile' => 'Mobile',
        'from' => 'From', 'to' => 'To', 'sendTest' => 'Send test', 'sendTestTitle' => 'Send a test email', 'sendTestBody' => 'Sends this template with the sample values to one address.',
        'email' => 'Email address', 'send' => 'Send', 'cancel' => 'Cancel', 'sent' => 'Test email sent.', 'invalidEmail' => 'Enter a valid email address.',
        'previewFrame' => 'Email preview', 'thumbnail' => 'Preview of {name}', 'deleteConfirm' => 'Delete {name}?', 'deleteBody' => 'This cannot be undone.',
        'failed' => 'Something went wrong. Try again.', 'htmlBody' => 'Body (HTML)',
        'categories' => ['welcome' => 'Welcome', 'transactional' => 'Transactional', 'marketing' => 'Marketing', 'notification' => 'Notification'],
        'statuses' => ['draft' => 'Draft', 'active' => 'Active'],
    ];
    $arabic = [
        'gallery' => 'قوالب البريد', 'search' => 'ابحث في القوالب…', 'newTemplate' => 'قالب جديد', 'untitled' => 'قالب بلا عنوان', 'all' => 'الكل',
        'updated' => 'آخر تحديث', 'noneTitle' => 'لا توجد قوالب بعد', 'noneHint' => 'أنشئ قالبًا لإعادة استخدام الرسالة نفسها في كل مكان.',
        'noMatchTitle' => 'لا توجد قوالب مطابقة', 'noMatchHint' => 'جرّب بحثًا أو تصنيفًا آخر.', 'duplicate' => 'تكرار', 'delete' => 'حذف',
        'back' => 'كل القوالب', 'save' => 'حفظ القالب', 'saved' => 'تم حفظ القالب.', 'unsaved' => 'تغييرات غير محفوظة', 'name' => 'اسم القالب', 'category' => 'التصنيف',
        'subject' => 'الموضوع', 'preheader' => 'نص المعاينة', 'preheaderHint' => 'السطر الرمادي الذي يظهر بعد الموضوع في معظم صناديق البريد.', 'body' => 'المحتوى', 'direction' => 'الاتجاه',
        'ltr' => 'من اليسار إلى اليمين', 'rtl' => 'من اليمين إلى اليسار', 'variables' => 'المتغيرات',
        'variablesHint' => 'انسخ المتغير والصقه في الموضوع أو المحتوى. يُستبدل بقيمته عند إرسال البريد.',
        'copyVariable' => 'نسخ {key}', 'unknown' => 'متغيرات غير معروفة: {keys}', 'edit' => 'تحرير', 'preview' => 'معاينة', 'desktop' => 'حاسوب', 'mobile' => 'جوال',
        'from' => 'من', 'to' => 'إلى', 'sendTest' => 'إرسال تجريبي', 'sendTestTitle' => 'إرسال بريد تجريبي', 'sendTestBody' => 'يرسل هذا القالب بالقيم التجريبية إلى عنوان واحد.',
        'email' => 'البريد الإلكتروني', 'send' => 'إرسال', 'cancel' => 'إلغاء', 'sent' => 'أُرسل البريد التجريبي.', 'invalidEmail' => 'أدخل بريدًا إلكترونيًا صالحًا.',
        'previewFrame' => 'معاينة البريد', 'thumbnail' => 'معاينة {name}', 'deleteConfirm' => 'حذف {name}؟', 'deleteBody' => 'لا يمكن التراجع عن هذا.',
        'failed' => 'حدث خطأ. حاول مرة أخرى.', 'htmlBody' => 'المحتوى (HTML)',
        'categories' => ['welcome' => 'ترحيب', 'transactional' => 'معاملات', 'marketing' => 'تسويق', 'notification' => 'إشعارات'],
        'statuses' => ['draft' => 'مسودة', 'active' => 'نشط'],
    ];
    $base = $ar ? $arabic : $en;
    $t = array_merge($base, (array) $labels);
    $t['categories'] = array_merge($base['categories'], (array) ($labels['categories'] ?? []));
    $t['statuses'] = array_merge($base['statuses'], (array) ($labels['statuses'] ?? []));
    $options = array_filter([
        'templates' => array_values((array) $templates), 'variables' => array_values((array) $variables), 'sender' => $sender, 'recipient' => $recipient,
        'selectedId' => $selectedId, 'locale' => $locale, 'canSave' => (bool) $canSave, 'canDuplicate' => (bool) $canDuplicate, 'canDelete' => (bool) $canDelete,
        'canSendTest' => (bool) $canSendTest, 'labels' => $t,
    ], fn ($v) => $v !== null);
    $tag = fn (string $k): string => '{'.'{'.$k.'}'.'}';
    $categoryKeys = ['welcome', 'transactional', 'marketing', 'notification'];
@endphp
<div data-slot="email-templates" x-data="nqEmailTemplates({!! \Illuminate\Support\Js::from($options) !!})" x-modelable="templates" {{ $attributes }}>
    {{-- Editor --}}
    <template x-if="draft">
        <div data-slot="email-template-editor" class="flex min-w-0 flex-col gap-4">
            <div class="flex flex-wrap items-center gap-2">
                <x-nq::button variant="ghost" x-on:click="back()">
                    <x-nq::icon name="arrow-left" aria-hidden="true" class="rtl:rotate-180" />
                    {{ $t['back'] }}
                </x-nq::button>
                <span class="ms-auto flex flex-wrap items-center gap-2">
                    <span x-show="dirty" style="display: none" class="text-caption text-muted-foreground">{{ $t['unsaved'] }}</span>
                    <template x-if="canSendTest">
                        <x-nq::button x-on:click="openTest()">
                            <x-nq::icon name="send" aria-hidden="true" />
                            {{ $t['sendTest'] }}
                        </x-nq::button>
                    </template>
                    <template x-if="canSave">
                        <x-nq::button variant="primary" x-on:click="save()" x-bind:aria-busy="saving ? 'true' : null" x-bind:disabled="! dirty || saving ? '' : null">
                            <span x-show="saving" style="display: none"><x-nq::spinner /></span>
                            {{ $t['save'] }}
                        </x-nq::button>
                    </template>
                </span>
            </div>
            <template x-if="message && message.tone === 'danger'"><x-nq::alert tone="danger"><span x-text="message.text"></span></x-nq::alert></template>
            <template x-if="message && message.tone === 'success'"><x-nq::alert tone="success"><span x-text="message.text"></span></x-nq::alert></template>
            <div class="flex gap-1 lg:hidden" role="tablist" aria-label="{{ $t['gallery'] }}">
                <x-nq::button type="button" role="tab" size="sm" x-bind:variant="pane === 'edit' ? 'secondary' : 'ghost'" x-bind:aria-selected="pane === 'edit' ? 'true' : 'false'" x-on:click="pane = 'edit'">{{ $t['edit'] }}</x-nq::button>
                <x-nq::button type="button" role="tab" size="sm" x-bind:aria-selected="pane === 'preview' ? 'true' : 'false'" x-on:click="pane = 'preview'">{{ $t['preview'] }}</x-nq::button>
            </div>
            <div class="grid min-w-0 gap-6 lg:grid-cols-2">
                <div class="flex min-w-0 flex-col gap-4 max-lg:[&[data-pane=preview]]:hidden" x-bind:data-pane="pane">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <x-nq::field>
                            <x-nq::field.label>{{ $t['name'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="draft.name" />
                        </x-nq::field>
                        <x-nq::field>
                            <x-nq::field.label>{{ $t['category'] }}</x-nq::field.label>
                            <x-nq::select x-model="draft.category">
                                <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                <x-nq::select.content>
                                    @foreach ($categoryKeys as $c)
                                        <x-nq::select.item :value="$c">{{ $t['categories'][$c] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.content>
                            </x-nq::select>
                        </x-nq::field>
                    </div>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['subject'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="draft.subject" dir="auto" />
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['preheader'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="draft.preheader" dir="auto" />
                        <x-nq::field.description>{{ $t['preheaderHint'] }}</x-nq::field.description>
                    </x-nq::field>
                    <div class="flex flex-col gap-1.5" x-on:focusin.capture="touched = true">
                        <span id="{{ $uid }}-body" class="text-label text-foreground">{{ $t['body'] }}</span>
                        @if ($load)
                            <x-nq::rich-text-editor x-model="draft.body" aria-label="{{ $t['body'] }}" min-height="14rem" :load="$load"
                                :toolbar="['bold', 'italic', 'underline', 'h2', 'h3', 'bulletList', 'orderedList', 'blockquote', 'link', 'undo', 'redo']" />
                        @else
                            <x-nq::field.textarea x-model="draft.body" dir="ltr" rows="10" aria-label="{{ $t['htmlBody'] }}" class="font-mono text-code" />
                        @endif
                    </div>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['direction'] }}</x-nq::field.label>
                        <x-nq::select x-model="draft.dir">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                <x-nq::select.item value="ltr">{{ $t['ltr'] }}</x-nq::select.item>
                                <x-nq::select.item value="rtl">{{ $t['rtl'] }}</x-nq::select.item>
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                    <section x-show="variables.length" style="display: none" aria-labelledby="{{ $uid }}-vars" class="flex flex-col gap-2">
                        <div>
                            <h3 id="{{ $uid }}-vars" class="text-label text-foreground">{{ $t['variables'] }}</h3>
                            <p class="text-body-sm text-muted-foreground">{{ $t['variablesHint'] }}</p>
                        </div>
                        <ul class="flex flex-wrap gap-2">
                            @foreach ((array) $variables as $v)
                                <li class="flex items-center gap-1 rounded-control border border-border bg-card ps-2 text-body-sm">
                                    <span class="text-muted-foreground">{{ $v['label'] }}</span>
                                    <bdi dir="ltr" class="font-mono text-code text-foreground">{{ $tag($v['key']) }}</bdi>
                                    <x-nq::copy-button :value="$tag($v['key'])" size="icon-sm" variant="ghost" :label="str_replace('{key}', $v['key'], $t['copyVariable'])" />
                                </li>
                            @endforeach
                        </ul>
                        <template x-if="unknown.length">
                            <x-nq::alert tone="warning"><span x-text="unknownText"></span></x-nq::alert>
                        </template>
                    </section>
                </div>
                <div class="min-w-0 max-lg:[&[data-pane=edit]]:hidden" x-bind:data-pane="pane">
                    <div data-slot="email-template-preview" class="flex min-w-0 flex-col gap-3">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-label text-foreground">{{ $t['preview'] }}</span>
                            <div role="group" aria-label="{{ $t['preview'] }}" class="inline-flex gap-0.5 rounded-control bg-nq-surface-soft p-0.5">
                                <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['desktop'] }}" x-bind:variant="device === 'desktop' ? 'secondary' : 'ghost'" x-bind:aria-pressed="device === 'desktop' ? 'true' : 'false'" x-on:click="device = 'desktop'"><x-nq::icon name="monitor" aria-hidden="true" class="size-4" /></x-nq::button>
                                <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['mobile'] }}" x-bind:variant="device === 'mobile' ? 'secondary' : 'ghost'" x-bind:aria-pressed="device === 'mobile' ? 'true' : 'false'" x-on:click="device = 'mobile'"><x-nq::icon name="smartphone" aria-hidden="true" class="size-4" /></x-nq::button>
                            </div>
                        </div>
                        <div class="flex justify-center rounded-card border border-border bg-secondary p-3">
                            <div class="flex w-full flex-col overflow-hidden rounded-card border border-border bg-card" x-bind:data-device="device" x-bind:class="device === 'mobile' ? 'max-w-[375px]' : 'max-w-[680px]'">
                                <div class="flex flex-col gap-0.5 border-b border-border px-4 py-3 text-body-sm">
                                    <span class="truncate text-label text-foreground" x-text="fill(draft.subject) || '—'"></span>
                                    <template x-if="sender">
                                        <span class="flex flex-wrap items-center gap-x-1 text-muted-foreground">
                                            {{ $t['from'] }}: <span class="text-foreground" x-text="sender.name"></span> <bdi dir="ltr" x-text="'<' + sender.email + '>'"></bdi>
                                        </span>
                                    </template>
                                    <template x-if="recipient">
                                        <span class="flex flex-wrap items-center gap-x-1 text-muted-foreground">
                                            {{ $t['to'] }}: <bdi dir="ltr" x-text="recipient"></bdi>
                                        </span>
                                    </template>
                                </div>
                                <iframe title="{{ $t['previewFrame'] }}" sandbox="" x-bind:srcdoc="srcdocOf(draft)" class="h-[520px] w-full border-0 bg-secondary"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </template>

    {{-- Gallery --}}
    <template x-if="! draft">
        <div data-slot="email-template-gallery" class="flex min-w-0 flex-col gap-4">
            <div class="flex flex-wrap items-center gap-2">
                <div class="relative min-w-48 flex-1 sm:max-w-sm">
                    <x-nq::icon name="search" aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
                    <x-nq::field.input type="search" x-model="query" aria-label="{{ $t['search'] }}" placeholder="{{ $t['search'] }}" class="ps-9" />
                </div>
                <template x-if="canSave">
                    <x-nq::button variant="primary" class="ms-auto" x-on:click="create()">
                        <x-nq::icon name="plus" aria-hidden="true" />
                        {{ $t['newTemplate'] }}
                    </x-nq::button>
                </template>
            </div>
            <div x-show="present.length > 1" style="display: none" role="tablist" aria-label="{{ $t['category'] }}" class="flex flex-wrap gap-1">
                <x-nq::button type="button" role="tab" size="sm" x-bind:variant="category === 'all' ? 'secondary' : 'ghost'" x-bind:aria-selected="category === 'all' ? 'true' : 'false'" x-on:click="category = 'all'">{{ $t['all'] }}</x-nq::button>
                @foreach ($categoryKeys as $c)
                    <x-nq::button type="button" role="tab" size="sm" x-show="present.includes('{{ $c }}')" style="display: none" x-bind:variant="category === '{{ $c }}' ? 'secondary' : 'ghost'" x-bind:aria-selected="category === '{{ $c }}' ? 'true' : 'false'" x-on:click="category = '{{ $c }}'">{{ $t['categories'][$c] }}</x-nq::button>
                @endforeach
            </div>
            <template x-if="error"><x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert></template>
            <x-nq::states.empty icon="mail" :title="$t['noneTitle']" :description="$t['noneHint']" x-show="templates.length === 0" style="display: none" />
            <x-nq::states.empty icon="mail" :title="$t['noMatchTitle']" :description="$t['noMatchHint']" x-show="templates.length > 0 && shown.length === 0" style="display: none" />
            <ul aria-label="{{ $t['gallery'] }}" class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4" x-show="shown.length > 0" style="display: none">
                <template x-for="tpl in shown" :key="tpl.id">
                    <li class="min-w-0">
                        <div data-slot="card" class="group flex h-full flex-col gap-0 overflow-hidden rounded-card border border-border bg-card p-0 text-card-foreground">
                            <button type="button" x-bind:aria-labelledby="'{{ $uid }}-' + tpl.id" x-on:click="edit(tpl)"
                                class="flex flex-col text-start outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                                <div dir="ltr" aria-hidden="true" class="relative flex h-44 justify-center overflow-hidden border-b border-border bg-secondary" x-bind:data-name="tpl.name" x-bind:title="fmt('thumbnail', { name: tpl.name })">
                                    <iframe tabindex="-1" sandbox="" x-bind:srcdoc="srcdocOf(tpl)" class="pointer-events-none absolute top-0 h-[440px] w-[600px] shrink-0 origin-top scale-[0.4] border-0" style="inset-inline-start: 50%; margin-inline-start: -300px" title=""></iframe>
                                </div>
                                <span class="flex flex-col gap-1.5 p-3">
                                    <span x-bind:id="'{{ $uid }}-' + tpl.id" class="truncate text-label text-foreground" x-text="tpl.name || labels.untitled"></span>
                                    <span class="truncate text-body-sm text-muted-foreground" x-text="fill(tpl.subject)"></span>
                                    <span class="flex flex-wrap items-center gap-1.5">
                                        <template x-if="tpl.status === 'active'"><x-nq::status tone="success">{{ $t['statuses']['active'] }}</x-nq::status></template>
                                        <template x-if="tpl.status !== 'active'"><x-nq::status tone="neutral">{{ $t['statuses']['draft'] }}</x-nq::status></template>
                                        <x-nq::badge variant="outline"><span x-text="labels.categories[tpl.category]"></span></x-nq::badge>
                                    </span>
                                </span>
                            </button>
                            <div class="mt-auto flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                                <span x-show="tpl.updatedAt != null" class="truncate text-caption text-muted-foreground">{{ $t['updated'] }} <span x-text="dateOf(tpl.updatedAt)"></span></span>
                                <span x-show="tpl.updatedAt == null"></span>
                                <span class="flex shrink-0 items-center">
                                    <template x-if="canDuplicate">
                                        <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="labels.duplicate + ': ' + tpl.name" x-bind:disabled="busy ? '' : null" x-on:click="duplicate(tpl)"><x-nq::icon name="copy" aria-hidden="true" /></x-nq::button>
                                    </template>
                                    <template x-if="canDelete">
                                        <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="labels.delete + ': ' + tpl.name" x-bind:disabled="busy ? '' : null" x-on:click="askDelete(tpl)"><x-nq::icon name="trash-2" aria-hidden="true" /></x-nq::button>
                                    </template>
                                </span>
                            </div>
                        </div>
                    </li>
                </template>
            </ul>
        </div>
    </template>

    {{-- Delete confirmation --}}
    <x-nq::dialog x-model="deleteOpen">
        <x-nq::dialog.content>
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="fmt('deleteConfirm', { name: pendingDelete ? (pendingDelete.name || labels.untitled) : '' })"></span></x-nq::dialog.title>
                <x-nq::dialog.description>{{ $t['deleteBody'] }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <x-nq::dialog.footer>
                <x-nq::button variant="ghost" x-on:click="deleteOpen = false" x-bind:disabled="busy ? '' : null">{{ $t['cancel'] }}</x-nq::button>
                <x-nq::button variant="danger" x-on:click="confirmDelete()" x-bind:aria-busy="busy ? 'true' : null" x-bind:disabled="busy ? '' : null">
                    <span x-show="busy" style="display: none"><x-nq::spinner /></span>
                    {{ $t['delete'] }}
                </x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>

    {{-- Send test --}}
    <x-nq::dialog x-model="testOpen">
        <x-nq::dialog.content>
            <form novalidate class="flex flex-col gap-4" x-on:submit.prevent="sendTest()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['sendTestTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['sendTestBody'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::field>
                    <x-nq::field.label>{{ $t['email'] }}</x-nq::field.label>
                    <x-nq::field.input type="email" ltr x-model="testEmail" autocomplete="email" />
                </x-nq::field>
                <template x-if="testMessage && testMessage.tone === 'danger'"><x-nq::alert tone="danger"><span x-text="testMessage.text"></span></x-nq::alert></template>
                <template x-if="testMessage && testMessage.tone === 'success'"><x-nq::alert tone="success"><span x-text="testMessage.text"></span></x-nq::alert></template>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="testOpen = false" x-bind:disabled="testPending ? '' : null">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="testPending ? 'true' : null" x-bind:disabled="testPending ? '' : null">
                        <x-nq::icon name="send" aria-hidden="true" />
                        {{ $t['send'] }}
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>

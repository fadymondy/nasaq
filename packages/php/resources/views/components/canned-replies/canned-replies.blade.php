{{-- <x-nq::canned-replies :replies="$replies" @save-reply="$event.detail.wait(…)" @delete-reply="…" />
     The library behind a composer's "/" menu: search, add, edit, duplicate and delete canned replies, as a table or as cards, with variable buttons and a live preview in the editor.
     Built on x-nq::entity-list, so the table cells are text and row actions also open as a context menu. Needs the Alpine runtime (@nasaqScripts).
     replies: [['id', 'shortcut' => 'refund' (typed after /), 'title', 'body' => 'Hi {{name}}, …', 'uses' => 38, 'updatedAt' => ISO string | epoch ms | DateTime]]. Rows start A to Z by shortcut.
     variables: [['key' => 'name', 'label' => 'Name', 'sample' => 'Sara']] the buttons of the editor and the values of its preview (name, agent and company by default).
     can-save: false hides add, edit and duplicate. can-delete: false hides delete. label: the list's accessible name. labels: override any string, e.g. ['add' => 'New snippet'].
     view: table | cards. page-size passes to the list.
     It is presentational: it fires events on the root with detail { …, wait(promise) }; your handler talks to the server. Resolve, or resolve { error } shown in the dialog or an alert.
       save-reply    { reply: { id, shortcut, title, body, uses?, updatedAt }, isNew }   resolve { error?, id? }; a new reply has an id that starts with "new-", a duplicate is a new reply
       delete-reply  { id, reply }                                                       resolve { error? }
     After a success the list is updated in the page. A rejected promise, or nobody listening, shows a generic error.
     Differences from the React component: the "Updated" column is a date without a time, and the delete confirmation shows the title it was opened for. --}}
@props(['replies' => [], 'variables' => null, 'canSave' => true, 'canDelete' => true, 'label' => null, 'labels' => [], 'view' => 'table', 'pageSize' => 0])
@php
    $t = \Nasaq\Nasaq::class;
    $ar = $t::rtl();
    $loc = $ar ? 'ar' : 'en';
    $L = array_merge([
        'label' => $t::t('Canned replies', 'الردود الجاهزة'), 'search' => $t::t('Search replies…', 'ابحث في الردود…'), 'shortcut' => $t::t('Shortcut', 'الاختصار'), 'title' => $t::t('Title', 'العنوان'),
        'body' => $t::t('Reply', 'الرد'), 'uses' => $t::t('Uses', 'مرات الاستخدام'), 'updated' => $t::t('Updated', 'آخر تعديل'), 'add' => $t::t('New reply', 'رد جديد'),
        'edit' => $t::t('Edit', 'تعديل'), 'duplicate' => $t::t('Duplicate', 'تكرار'), 'remove' => $t::t('Delete', 'حذف'),
        'empty' => $t::t('No canned replies yet', 'لا توجد ردود جاهزة بعد'), 'emptyHint' => $t::t('Save the answers you type again and again, and insert them with a slash.', 'احفظ الإجابات التي تكتبها مرارًا، وأدرجها بشرطة مائلة.'),
        'dialogNew' => $t::t('New canned reply', 'رد جاهز جديد'), 'dialogEdit' => $t::t('Edit canned reply', 'تعديل الرد الجاهز'),
        'dialogHint' => $t::t('Type the shortcut after a slash in any composer to insert the reply.', 'اكتب الاختصار بعد شرطة مائلة في أي مربع كتابة لإدراج الرد.'),
        'shortcutHint' => $t::t('Letters, digits, hyphen. Typed after /.', 'حروف وأرقام وشرطة. يُكتب بعد /.'), 'titleHint' => $t::t('Only your team sees this.', 'يراه فريقك فقط.'),
        'bodyHint' => $t::t('Insert a variable and it is filled in for each conversation.', 'أدرج متغيرًا ليُملأ تلقائيًا في كل محادثة.'),
        'variables' => $t::t('Variables', 'المتغيرات'), 'insertVariable' => $t::t('Insert {label}', 'إدراج {label}'), 'preview' => $t::t('Preview', 'معاينة'), 'previewHint' => $t::t('With sample values', 'بقيم تجريبية'),
        'save' => $t::t('Save reply', 'حفظ الرد'), 'cancel' => $t::t('Cancel', 'إلغاء'), 'removeTitle' => $t::t('Delete “{title}”?', 'حذف «{title}»؟'),
        'removeBody' => $t::t('It disappears for everyone on your team. Messages already sent are not changed.', 'يختفي عن كل أعضاء فريقك. الرسائل المرسلة لا تتغير.'),
        'failed' => $t::t('That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
    ], (array) $labels);
    $issues = array_merge([
        'title-empty' => $t::t('Give the reply a title.', 'أعطِ الرد عنوانًا.'), 'shortcut-empty' => $t::t('Add a shortcut.', 'أضف اختصارًا.'),
        'shortcut-duplicate' => $t::t('Another reply already uses this shortcut.', 'يستخدم رد آخر هذا الاختصار.'), 'body-empty' => $t::t('Write the reply.', 'اكتب الرد.'),
        'variable-unknown' => $t::t('The reply uses a variable that does not exist.', 'يستخدم الرد متغيرًا غير موجود.'),
    ], (array) ($labels['issues'] ?? []));
    $vars = collect($variables ?? [
        ['key' => 'name', 'label' => $t::t('Name', 'الاسم'), 'sample' => $t::t('Sara', 'سارة')],
        ['key' => 'agent', 'label' => $t::t('Agent', 'الموظف'), 'sample' => $t::t('Omar', 'عمر')],
        ['key' => 'company', 'label' => $t::t('Company', 'الشركة'), 'sample' => $t::t('Nasaq', 'نسق')],
    ])->map(fn ($v) => ['key' => (string) $v['key'], 'label' => (string) ($v['label'] ?? $v['key']), 'sample' => (string) ($v['sample'] ?? '')])->values()->all();
    $when = fn ($v) => $v instanceof \DateTimeInterface ? $v->format(DATE_ATOM) : $v;
    $items = collect($replies)->map(fn ($r) => array_filter([
        'id' => (string) $r['id'], 'shortcut' => (string) $r['shortcut'], 'title' => (string) $r['title'], 'body' => (string) $r['body'],
        'uses' => isset($r['uses']) ? (int) $r['uses'] : null, 'updatedAt' => $when($r['updatedAt'] ?? null),
    ], fn ($v) => $v !== null))->values()->all();
    $config = [
        'replies' => $items, 'variables' => $vars, 'can' => ['save' => (bool) $canSave, 'delete' => (bool) $canDelete], 'locale' => $loc,
        'labels' => ['failed' => $L['failed'], 'duplicate' => mb_strtolower($L['duplicate']), 'removeTitle' => $L['removeTitle'], 'issues' => $issues],
    ];
    $columns = [
        ['id' => 'shortcut', 'key' => 'shortcutText', 'header' => $L['shortcut'], 'sortable' => true, 'searchable' => true],
        ['id' => 'title', 'header' => $L['title'], 'sortable' => true, 'searchable' => true],
        ['id' => 'body', 'header' => $L['body'], 'searchable' => true],
        ['id' => 'uses', 'key' => 'usesText', 'header' => $L['uses'], 'align' => 'end'],
        ['id' => 'updated', 'key' => 'updatedText', 'header' => $L['updated'], 'align' => 'end'],
    ];
    $actions = array_values(array_filter([
        $canSave ? ['id' => 'edit', 'label' => $L['edit'], 'icon' => 'pencil'] : null,
        $canSave ? ['id' => 'duplicate', 'label' => $L['duplicate'], 'icon' => 'copy'] : null,
        $canDelete ? ['id' => 'delete', 'label' => $L['remove'], 'icon' => 'trash-2', 'danger' => true, 'group' => 'danger'] : null,
    ]));
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'canned-replies') }}" x-data="nqCannedReplies(@js($config))" x-on:nq-entity-list-action="onAction($event)" x-on:nq-entity-list-row-click="onRowClick($event)"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <template x-if="failure"><x-nq::alert tone="danger" dismissible x-on:nq:dismiss="failure = null"><span x-text="failure"></span></x-nq::alert></template>

    <x-nq::entity-list x-model="list.rows" :label="$label ?? $L['label']" :search="$L['search']" :columns="$columns" :rows="[]" :view="$view" :selectable="false" :page-size="$pageSize" :row-actions="$actions">
        @if ($canSave)
            <x-slot:toolbar>
                <x-nq::button type="button" size="sm" variant="primary" class="ms-auto" x-on:click="openForm(null)"><x-lucide-plus aria-hidden="true" />{{ $L['add'] }}</x-nq::button>
            </x-slot:toolbar>
        @endif
        <x-slot:card>
            <div class="flex min-w-0 flex-col gap-2">
                <bdi dir="ltr" class="w-fit rounded-[4px] bg-secondary px-1.5 py-0.5 font-mono text-caption text-foreground" x-text="row.shortcutText"></bdi>
                <span dir="auto" class="text-label text-foreground" x-text="row.title"></span>
                <span dir="auto" class="line-clamp-3 text-body-sm text-muted-foreground" x-text="row.body"></span>
                <span class="flex items-center gap-1.5 text-caption text-muted-foreground" x-show="row.hasUses" style="display: none">{{ $L['uses'] }} <span class="tabular-nums text-foreground" x-text="row.usesText"></span></span>
            </div>
        </x-slot:card>
        <x-slot:empty><x-nq::states.empty icon="message-square-text" :title="$L['empty']" :description="$L['emptyHint']" class="border-0" /></x-slot:empty>
    </x-nq::entity-list>

    @if ($canSave)
        {{-- The editor. --}}
        <x-nq::dialog x-model="form.open">
            <x-nq::dialog.content class="max-w-2xl">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-show="form.isNew">{{ $L['dialogNew'] }}</span><span x-show="! form.isNew" style="display: none">{{ $L['dialogEdit'] }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $L['dialogHint'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <form novalidate data-slot="canned-reply-editor" class="flex flex-col gap-4" x-on:submit.prevent="saveForm()">
                    <template x-if="form.error"><x-nq::alert tone="danger"><span x-text="form.error"></span></x-nq::alert></template>
                    <div class="grid gap-4 sm:grid-cols-[1fr_12rem]">
                        <x-nq::field x-model="form.invalid.title">
                            <x-nq::field.label>{{ $L['title'] }}</x-nq::field.label>
                            <x-nq::field.input x-model="form.title" x-on:input="onFormInput()" autocomplete="off" />
                            <x-nq::field.error>{{ $issues['title-empty'] }}</x-nq::field.error>
                            <x-nq::field.description>{{ $L['titleHint'] }}</x-nq::field.description>
                        </x-nq::field>
                        <x-nq::field x-model="form.invalid.shortcut">
                            <x-nq::field.label>{{ $L['shortcut'] }}</x-nq::field.label>
                            <div class="flex items-center gap-1">
                                <span aria-hidden="true" class="text-muted-foreground">/</span>
                                <x-nq::field.input x-model="form.shortcut" x-on:input="onShortcutInput()" ltr autocomplete="off" spellcheck="false" />
                            </div>
                            <x-nq::field.error><span x-text="form.shortcutMessage"></span></x-nq::field.error>
                            <x-nq::field.description>{{ $L['shortcutHint'] }}</x-nq::field.description>
                        </x-nq::field>
                    </div>
                    <x-nq::field x-model="form.invalid.body">
                        <x-nq::field.label>{{ $L['body'] }}</x-nq::field.label>
                        <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="{{ $L['variables'] }}">
                            <span class="text-caption text-muted-foreground">{{ $L['variables'] }}</span>
                            @foreach ($vars as $v)
                                <x-nq::button type="button" size="sm" variant="secondary" data-slot="canned-reply-variable" aria-label="{{ str_replace('{label}', $v['label'], $L['insertVariable']) }}" x-on:click="insertVar('{{ $v['key'] }}', $el)">{{ $v['label'] }}</x-nq::button>
                            @endforeach
                        </div>
                        <x-nq::field.textarea x-model="form.body" x-on:input="onFormInput()" rows="5" />
                        <x-nq::field.error><span x-text="form.bodyMessage"></span></x-nq::field.error>
                        <x-nq::field.description>{{ $L['bodyHint'] }}</x-nq::field.description>
                    </x-nq::field>
                    <div class="flex flex-col gap-1.5" aria-live="polite">
                        <span class="text-label text-foreground">{{ $L['preview'] }} <span class="text-caption font-normal text-muted-foreground">{{ $L['previewHint'] }}</span></span>
                        <p data-slot="canned-reply-preview" dir="auto" class="min-h-12 whitespace-pre-wrap rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm text-foreground" x-text="previewText"></p>
                    </div>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="form.open = false" x-bind:disabled="form.pending ? '' : null">{{ $L['cancel'] }}</x-nq::button>
                        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="form.pending ? 'true' : null">
                            <x-nq::spinner x-show="form.pending" style="display: none" />
                            {{ $L['save'] }}
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canDelete)
        {{-- Delete asks first. --}}
        <x-nq::alert-dialog x-model="confirm.open">
            <x-nq::alert-dialog.content>
                <div data-slot="canned-replies-confirm" class="grid gap-4">
                    <x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.title><span x-text="confirm.title"></span></x-nq::alert-dialog.title>
                        <x-nq::alert-dialog.description>{{ $L['removeBody'] }}</x-nq::alert-dialog.description>
                    </x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.footer>
                        <x-nq::alert-dialog.cancel>{{ $L['cancel'] }}</x-nq::alert-dialog.cancel>
                        <x-nq::alert-dialog.action x-on:click="runConfirm()">{{ $L['remove'] }}</x-nq::alert-dialog.action>
                    </x-nq::alert-dialog.footer>
                </div>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</div>

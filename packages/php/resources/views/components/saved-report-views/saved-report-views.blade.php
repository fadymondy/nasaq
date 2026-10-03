{{-- <x-nq::saved-report-views x-model="filters" :views="[['id' => 'a', 'name' => 'Weekly review', 'query' => 'range=7d']]" :fields="$fields" can-rename can-update can-share can-delete />
     Named filter sets for a report. Each view is a chip; context-click, the Menu key or the "..." button opens rename, update, share and delete.
     A view opened and then changed shows "Changed", with update and save-as-new.
     views: [['id', 'name', 'query' => the URL form of the filters, 'shared'?]]. fields: the same list as <x-nq::report-filter-bar>. state: the current filters, x-modelable (x-model="filters",
     the same value the filter bar edits). defaults: what a query that leaves a key out means (default: the last 30 days, no comparison, no filters). active-id: the opened view (default: the last
     opened, or the one whose filters match). can-rename, can-update, can-share, can-delete: which actions to offer; each needs a handler, or the change is made in the page only.
     Events (cancelable; call $event.detail.waitUntil(promise), resolve() or reject(message); one nobody claims is applied locally): "nq-view-save" { name, query }, "nq-view-rename" { view, name },
     "nq-view-update" { view, query }, "nq-view-share" { view, shared } (resolve with a link and it is copied), "nq-view-delete" { view }; "nq-view-apply" { view, state } just tells you.
     labels: override the strings by key. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['views' => [], 'fields' => [], 'state' => null, 'defaults' => null, 'activeId' => null, 'canRename' => false, 'canUpdate' => false, 'canShare' => false, 'canDelete' => false, 'labels' => []])
@php
    $N = \Nasaq\Nasaq::class;
    $L = array_merge([
        'views' => $N::t('Saved views', 'العروض المحفوظة'),
        'noViews' => $N::t('No saved views yet. Set the filters you use often and save them.', 'لا توجد عروض محفوظة بعد. اضبط المرشّحات التي تستخدمها كثيرًا واحفظها.'),
        'saveView' => $N::t('Save view', 'حفظ العرض'),
        'saveAsNew' => $N::t('Save as new view', 'حفظ كعرض جديد'),
        'saveTitle' => $N::t('Save this view', 'حفظ هذا العرض'),
        'saveHelp' => $N::t('Stores the period and filters as they are now.', 'يحفظ الفترة والمرشّحات كما هي الآن.'),
        'renameTitle' => $N::t('Rename view', 'إعادة تسمية العرض'),
        'nameLabel' => $N::t('Name', 'الاسم'),
        'namePlaceholder' => $N::t('Weekly review', 'المراجعة الأسبوعية'),
        'nameInvalid' => $N::t('Enter a name of up to 60 characters.', 'أدخل اسمًا لا يزيد عن 60 حرفًا.'),
        'save' => $N::t('Save', 'حفظ'),
        'cancel' => $N::t('Cancel', 'إلغاء'),
        'saving' => $N::t('Saving', 'جارٍ الحفظ'),
        'failed' => $N::t('That did not save. Try again.', 'تعذّر الحفظ. حاول مرة أخرى.'),
        'apply' => $N::t('Open view', 'فتح العرض'),
        'rename' => $N::t('Rename', 'إعادة تسمية'),
        'update' => $N::t('Update with current filters', 'تحديث بالمرشّحات الحالية'),
        'modified' => $N::t('Changed', 'معدَّل'),
        'share' => $N::t('Share', 'مشاركة'),
        'unshare' => $N::t('Stop sharing', 'إيقاف المشاركة'),
        'copyLink' => $N::t('Copy link', 'نسخ الرابط'),
        'linkCopied' => $N::t('Link copied', 'تم نسخ الرابط'),
        'shared' => $N::t('Shared', 'مشترك'),
        'remove' => $N::t('Delete', 'حذف'),
        'deleteTitle' => $N::t('Delete "{0}"?', 'حذف «{0}»؟'),
        'deleteBody' => $N::t('The view is removed for everyone it is shared with. The report itself is not changed.', 'يُزال العرض لكل من شاركته معه. لا يتغير التقرير نفسه.'),
        'more' => $N::t('Actions for {0}', 'إجراءات {0}'),
    ], (array) $labels);
    $fields = array_values(array_map(fn ($f) => [
        'id' => (string) $f['id'],
        'kind' => $f['kind'] ?? 'select',
        'label' => (string) ($f['label'] ?? $f['id']),
        'options' => array_values(array_map(fn ($o) => ['value' => (string) $o['value'], 'label' => (string) ($o['label'] ?? $o['value'])], (array) ($f['options'] ?? []))),
    ], (array) $fields));
    $init = [
        'views' => array_values(array_map(fn ($v) => (array) $v, (array) $views)),
        'fields' => $fields, 'state' => $state, 'defaults' => $defaults, 'activeId' => $activeId,
        'canRename' => (bool) $canRename, 'canUpdate' => (bool) $canUpdate, 'canShare' => (bool) $canShare, 'canDelete' => (bool) $canDelete,
        't' => $L,
    ];
    $any = $canRename || $canUpdate || $canShare || $canDelete;
    $menu = 'fixed z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none max-h-[var(--available-height)] overflow-y-auto transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'saved-report-views') }}" aria-label="{{ $L['views'] }}" x-data="nqSavedReportViews({!! \Illuminate\Support\Js::from($init) !!})" x-modelable="state"
    {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-2') }}>
    <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-label text-muted-foreground">{{ $L['views'] }}</h3>
        <p x-show="views.length === 0" @if (count($init['views']) > 0) style="display: none" @endif class="text-body-sm text-muted-foreground">{{ $L['noViews'] }}</p>
        <ul class="flex min-w-0 flex-wrap items-center gap-1.5">
            <template x-for="view in views" :key="view.id">
                <li x-data="nqContextMenu()" x-bind="trigger" class="flex items-center rounded-full">
                    <template x-if="isCurrent(view)">
                        <x-nq::button variant="secondary" size="sm" class="rounded-full border-primary" aria-pressed="true" x-on:click="apply(view)">
                            <span x-text="view.name"></span>
                            <x-nq::badge variant="info" x-show="view.shared" style="display: none">{{ $L['shared'] }}</x-nq::badge>
                            <x-nq::badge variant="warning" x-show="dirty" style="display: none">{{ $L['modified'] }}</x-nq::badge>
                        </x-nq::button>
                    </template>
                    <template x-if="!isCurrent(view)">
                        <x-nq::button variant="ghost" size="sm" class="rounded-full" aria-pressed="false" x-on:click="apply(view)">
                            <span x-text="view.name"></span>
                            <x-nq::badge variant="info" x-show="view.shared" style="display: none">{{ $L['shared'] }}</x-nq::badge>
                        </x-nq::button>
                    </template>
                    @if ($any)
                        <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-label="moreLabel(view)" x-on:click="openAt(anchorX($event), anchorY($event), true)">
                            <x-lucide-ellipsis aria-hidden="true" />
                        </x-nq::button>
                    @endif
                    <template x-teleport="body">
                        <div data-slot="context-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" class="{{ $menu }}">
                            <x-nq::context-menu.item x-on:click="apply(view)"><x-lucide-bookmark aria-hidden="true" />{{ $L['apply'] }}</x-nq::context-menu.item>
                            @if ($canRename)
                                <x-nq::context-menu.separator />
                                <x-nq::context-menu.item x-on:click="openRename(view)"><x-lucide-pencil aria-hidden="true" />{{ $L['rename'] }}</x-nq::context-menu.item>
                            @endif
                            @if ($canUpdate)
                                <x-nq::context-menu.item x-bind:data-disabled="matches(view) ? '' : undefined" x-bind:aria-disabled="matches(view) ? 'true' : undefined" x-on:click="updateView(view)"><x-lucide-save aria-hidden="true" />{{ $L['update'] }}</x-nq::context-menu.item>
                            @endif
                            @if ($canShare)
                                <x-nq::context-menu.separator />
                                <template x-if="view.shared">
                                    <div class="contents">
                                        <x-nq::context-menu.item x-on:click="copyLink(view)"><x-lucide-link-2 aria-hidden="true" />{{ $L['copyLink'] }}</x-nq::context-menu.item>
                                        <x-nq::context-menu.item x-on:click="shareView(view, false)"><x-lucide-share-2 aria-hidden="true" />{{ $L['unshare'] }}</x-nq::context-menu.item>
                                    </div>
                                </template>
                                <template x-if="!view.shared">
                                    <x-nq::context-menu.item x-on:click="shareView(view, true)"><x-lucide-share-2 aria-hidden="true" />{{ $L['share'] }}</x-nq::context-menu.item>
                                </template>
                            @endif
                            @if ($canDelete)
                                <x-nq::context-menu.separator />
                                <x-nq::context-menu.item variant="danger" x-on:click="openDelete(view)"><x-lucide-trash-2 aria-hidden="true" />{{ $L['remove'] }}</x-nq::context-menu.item>
                            @endif
                        </div>
                    </template>
                </li>
            </template>
        </ul>
        <div class="ms-auto flex items-center gap-2">
            @if ($canUpdate)
                <x-nq::button variant="secondary" size="sm" x-show="showUpdate" style="display: none" x-on:click="updateCurrent()">
                    <x-lucide-save aria-hidden="true" />
                    {{ $L['update'] }}
                </x-nq::button>
            @endif
            <x-nq::button variant="primary" size="sm" x-show="dirty || !current" x-on:click="openSave()">
                <x-lucide-bookmark aria-hidden="true" />
                <span x-text="saveLabel">{{ $L['saveView'] }}</span>
            </x-nq::button>
            <x-nq::button variant="ghost" size="sm" x-show="!(dirty || !current)" style="display: none" x-on:click="openSave()">
                <x-lucide-bookmark aria-hidden="true" />
                <span x-text="saveLabel">{{ $L['saveView'] }}</span>
            </x-nq::button>
        </div>
    </div>
    <p aria-live="polite" class="min-h-4 text-caption text-muted-foreground" x-text="note"></p>

    <x-nq::dialog x-model="nameOpen">
        <x-nq::dialog.content data-slot="report-name-dialog">
            <form class="grid gap-4" novalidate x-on:submit.prevent="submitName()">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="nameTitle">{{ $L['saveTitle'] }}</span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="kind === 'rename' ? '' : t.saveHelp">{{ $L['saveHelp'] }}</span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <div class="flex flex-col gap-1.5">
                    <label class="text-label text-foreground" for="nq-report-view-name">{{ $L['nameLabel'] }}</label>
                    <x-nq::field.input id="nq-report-view-name" x-model="name" maxlength="80" placeholder="{{ $L['namePlaceholder'] }}" x-bind:aria-invalid="nameInvalid ? 'true' : null" />
                    <p role="alert" x-show="nameInvalid" style="display: none" class="text-caption text-nq-danger-text">{{ $L['nameInvalid'] }}</p>
                </div>
                <p x-show="error" style="display: none" role="alert" class="text-body-sm text-destructive" x-text="error"></p>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-bind:disabled="busy" x-on:click="close()">{{ $L['cancel'] }}</x-nq::button>
                    <x-nq::button type="submit" x-bind:disabled="!nameValid"><span x-text="busyLabel">{{ $L['save'] }}</span></x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
    @if ($canDelete)
        <x-nq::alert-dialog x-model="deleteOpen">
            <x-nq::alert-dialog.content>
                <x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.title><span x-text="deleteTitle"></span></x-nq::alert-dialog.title>
                    <x-nq::alert-dialog.description>{{ $L['deleteBody'] }}</x-nq::alert-dialog.description>
                </x-nq::alert-dialog.header>
                <x-nq::alert-dialog.footer>
                    <x-nq::alert-dialog.cancel>{{ $L['cancel'] }}</x-nq::alert-dialog.cancel>
                    <x-nq::alert-dialog.action x-on:click="confirmDelete()">{{ $L['remove'] }}</x-nq::alert-dialog.action>
                </x-nq::alert-dialog.footer>
            </x-nq::alert-dialog.content>
        </x-nq::alert-dialog>
    @endif
</section>

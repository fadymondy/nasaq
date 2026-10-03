{{-- <x-nq::status-label-manager :statuses="$statuses" :labels="$labels" x-on:nq-save-status="$event.detail.waitUntil(save($event.detail.draft))" />
     Manage the two vocabularies of a work tracker: workflow statuses (a name, a colour and a stage, ordered inside their stage) and free labels (a name and a colour).
     Create and edit go through a dialog with validation; delete asks first and says how many items lose the value. Every row also opens its actions from a context menu.
     statuses: [['id', 'name', 'hue' (gray red orange amber green teal blue violet pink), 'stage' (backlog todo active review done canceled), 'usage' (optional count)]].
     labels: [['id', 'name', 'hue', 'usage']]. default-tab: statuses (default) | labels. copy: any of the strings below, by key ({name} and {n} are filled in).
     It has no backend: it fires events on the root with detail { …, waitUntil(promise) }; your handler saves, then you re-render with the new lists.
       nq-save-status detail.draft { id?, name, hue, stage };  nq-delete-status detail.id;  nq-reorder-statuses detail.ids (the full new order);
       nq-save-label detail.draft { id?, name, hue };  nq-delete-label detail.id.
     Resolve { error: "…" } to show why it failed; a rejected promise shows a generic error. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['statuses' => [], 'labels' => [], 'defaultTab' => 'statuses', 'copy' => []])
@php
    $L = fn (string $key, string $en, string $arabic) => $copy[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $ar = \Nasaq\Nasaq::rtl();
    $fill = fn (string $text, array $vars) => str_replace(array_map(fn ($k) => '{'.$k.'}', array_keys($vars)), array_values($vars), $text);
    $nameMax = 32;
    $stageNames = [
        'backlog' => $L('stageBacklog', 'Backlog', 'قائمة الانتظار'),
        'todo' => $L('stageTodo', 'To do', 'للتنفيذ'),
        'active' => $L('stageActive', 'In progress', 'قيد التنفيذ'),
        'review' => $L('stageReview', 'In review', 'قيد المراجعة'),
        'done' => $L('stageDone', 'Done', 'منجز'),
        'canceled' => $L('stageCanceled', 'Canceled', 'ملغى'),
    ];
    // The word for a count, by the language's plural rules.
    $usedBy = function (int $n) use ($L, $ar, $fill) {
        if ($n === 0) return $L('usedByNone', 'Not used', 'غير مستخدم');
        if ($n === 1) return $L('usedByOne', 'Used by 1 item', 'يستخدمه عنصر واحد');
        if ($ar && $n === 2) return $L('usedByTwo', 'Used by 2 items', 'يستخدمه عنصران');
        if ($ar && $n <= 10) return $fill($L('usedByFew', 'Used by {n} items', 'يستخدمه {n} عناصر'), ['n' => $n]);
        return $fill($L('usedByMany', 'Used by {n} items', 'يستخدمه {n} عنصرًا'), ['n' => $n]);
    };
    $deleteBody = function (int $n) use ($L, $fill) {
        if ($n === 0) return $L('deleteBodyNone', 'Nothing uses it, so nothing else changes.', 'لا شيء يستخدمه، فلن يتغير أي شيء آخر.');
        if ($n === 1) return $L('deleteBodyOne', '1 item uses it. It loses this value.', 'يستخدمه عنصر واحد وسيفقد هذه القيمة.');
        return $fill($L('deleteBodyMany', '{n} items use it. They lose this value.', 'يستخدمه {n} عنصرًا وسيفقدون هذه القيمة.'), ['n' => $n]);
    };
    $edit = fn ($name) => $fill($L('edit', 'Edit {name}', 'تعديل {name}'), ['name' => $name]);
    $remove = fn ($name) => $fill($L('remove', 'Delete {name}', 'حذف {name}'), ['name' => $name]);
    $moveUp = fn ($name) => $fill($L('moveUp', 'Move {name} up', 'نقل {name} لأعلى'), ['name' => $name]);
    $moveDown = fn ($name) => $fill($L('moveDown', 'Move {name} down', 'نقل {name} لأسفل'), ['name' => $name]);
    $statusTitle = $L('deleteStatusTitle', 'Delete status {name}?', 'حذف الحالة {name}؟');
    $labelTitle = $L('deleteLabelTitle', 'Delete label {name}?', 'حذف التصنيف {name}؟');

    $statusList = collect($statuses)->values()->map(fn ($s, $i) => $s + ['usage' => null, '_i' => $i])->all();
    $labelList = collect($labels)->values()->map(fn ($s, $i) => $s + ['usage' => null, '_i' => $i])->all();
    $item = fn ($s, $title) => [
        'id' => (string) $s['id'], 'name' => $s['name'], 'hue' => $s['hue'], 'usage' => $s['usage'],
        'delTitle' => $fill($title, ['name' => $s['name']]), 'delBody' => $deleteBody((int) ($s['usage'] ?? 0)),
    ] + (isset($s['stage']) ? ['stage' => $s['stage']] : []);
    $config = [
        'statuses' => array_map(fn ($s) => $item($s, $statusTitle), $statusList),
        'tags' => array_map(fn ($s) => $item($s, $labelTitle), $labelList),
        'copy' => [
            'editStatus' => $L('editStatus', 'Edit status', 'تعديل الحالة'),
            'editLabel' => $L('editLabel', 'Edit label', 'تعديل التصنيف'),
            'statusesBody' => $L('statusesBody', 'The steps work moves through. Each status belongs to a stage, so reports know what is open and what is done.', 'الخطوات التي يمر بها العمل. تنتمي كل حالة إلى مرحلة، لتعرف التقارير ما هو مفتوح وما هو منجز.'),
            'labelsBody' => $L('labelsBody', 'Free-form tags you can put on any item.', 'وسوم حرة يمكنك وضعها على أي عنصر.'),
            'save' => $L('save', 'Save', 'حفظ'),
            'create' => $L('create', 'Create', 'إنشاء'),
            'failed' => $L('failed', 'Could not save. Try again.', 'تعذّر الحفظ. حاول مرة أخرى.'),
            'empty' => $L('errorEmpty', 'Give it a name.', 'اكتب اسمًا.'),
            'tooLong' => $L('errorTooLong', 'Use {n} characters or fewer.', 'استخدم {n} حرفًا أو أقل.'),
            'duplicate' => $L('errorDuplicate', 'That name is already used.', 'هذا الاسم مستخدم بالفعل.'),
        ],
    ];
    $groups = [];
    foreach ($stageNames as $stage => $stageName) {
        $groups[] = ['stage' => $stage, 'name' => $stageName, 'items' => array_values(array_filter($statusList, fn ($s) => $s['stage'] === $stage))];
    }
    $hasDone = collect($statusList)->contains(fn ($s) => $s['stage'] === 'done');
    $cancel = $L('cancel', 'Cancel', 'إلغاء');
    $rowClass = 'flex flex-wrap items-center gap-3 px-4 py-2.5';
    $cfg = $config['copy'];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'status-label-manager') }}" x-data="nqStatusLabelManager(@js($config))" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <template x-if="error !== ''">
        <x-nq::alert tone="danger"><span x-text="error"></span></x-nq::alert>
    </template>
    <x-nq::tabs :default-value="$defaultTab">
        <x-nq::tabs.list variant="underline">
            <x-nq::tabs.tab value="statuses">{{ $L('statuses', 'Statuses', 'الحالات') }}</x-nq::tabs.tab>
            <x-nq::tabs.tab value="labels">{{ $L('labels', 'Labels', 'التصنيفات') }}</x-nq::tabs.tab>
            <x-nq::tabs.indicator />
        </x-nq::tabs.list>

        <x-nq::tabs.panel value="statuses" class="mt-4 flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="max-w-prose text-body-sm text-muted-foreground">{{ $cfg['statusesBody'] }}</p>
                <x-nq::button variant="primary" x-on:click="openCreate('status')"><x-lucide-plus aria-hidden="true" />{{ $L('addStatus', 'New status', 'حالة جديدة') }}</x-nq::button>
            </div>
            @unless ($hasDone)
                <x-nq::alert tone="warning">{{ $L('noDone', 'Add a status in the Done stage so finished work can be counted.', 'أضف حالة في مرحلة «منجز» ليمكن احتساب العمل المنتهي.') }}</x-nq::alert>
            @endunless
            <div class="flex flex-col gap-3">
                @foreach ($groups as $g)
                    <x-nq::card :data-stage="$g['stage']" class="gap-0 py-0">
                        <div class="flex items-center justify-between border-b border-border px-4 py-2">
                            <h3 class="text-label text-foreground">{{ $g['name'] }}</h3>
                            <x-nq::numeric :value="count($g['items'])" class="text-caption text-muted-foreground" />
                        </div>
                        @if (count($g['items']) === 0)
                            <p class="px-4 py-3 text-body-sm text-muted-foreground">{{ $L('stageEmpty', 'No statuses in this stage', 'لا توجد حالات في هذه المرحلة') }}</p>
                        @else
                            <div role="list" class="flex flex-col">
                                @foreach ($g['items'] as $pos => $s)
                                    @php
                                        $isFirst = $pos === 0;
                                        $isLast = $pos === count($g['items']) - 1;
                                        $border = $pos === 0 ? '' : 'border-t border-border';
                                    @endphp
                                    <x-nq::context-menu>
                                        <x-nq::context-menu.trigger role="listitem" class="{{ $rowClass }} {{ $border }}">
                                            <x-nq::badge variant="tag" :hue="$s['hue']">{{ $s['name'] }}</x-nq::badge>
                                            <span class="min-w-0 flex-1 text-caption text-muted-foreground">@if ($s['usage'] !== null){{ $usedBy((int) $s['usage']) }}@endif</span>
                                            <div class="flex items-center">
                                                <x-nq::button variant="ghost" size="icon-sm" :disabled="$isFirst" :aria-label="$moveUp($s['name'])" x-on:click="move({{ $s['_i'] }}, -1)"><x-lucide-arrow-up aria-hidden="true" /></x-nq::button>
                                                <x-nq::button variant="ghost" size="icon-sm" :disabled="$isLast" :aria-label="$moveDown($s['name'])" x-on:click="move({{ $s['_i'] }}, 1)"><x-lucide-arrow-down aria-hidden="true" /></x-nq::button>
                                                <x-nq::button variant="ghost" size="icon-sm" :aria-label="$edit($s['name'])" x-on:click="openEdit('status', {{ $s['_i'] }})"><x-lucide-pencil aria-hidden="true" /></x-nq::button>
                                                <x-nq::button variant="ghost" size="icon-sm" :aria-label="$remove($s['name'])" x-on:click="askDelete('status', {{ $s['_i'] }})"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                            </div>
                                        </x-nq::context-menu.trigger>
                                        <x-nq::context-menu.content>
                                            <x-nq::context-menu.item x-on:click="openEdit('status', {{ $s['_i'] }})"><x-lucide-pencil aria-hidden="true" />{{ $cfg['editStatus'] }}</x-nq::context-menu.item>
                                            <x-nq::context-menu.item :disabled="$isFirst" x-on:click="move({{ $s['_i'] }}, -1)"><x-lucide-arrow-up aria-hidden="true" />{{ $moveUp($s['name']) }}</x-nq::context-menu.item>
                                            <x-nq::context-menu.item :disabled="$isLast" x-on:click="move({{ $s['_i'] }}, 1)"><x-lucide-arrow-down aria-hidden="true" />{{ $moveDown($s['name']) }}</x-nq::context-menu.item>
                                            <x-nq::context-menu.separator />
                                            <x-nq::context-menu.item variant="danger" x-on:click="askDelete('status', {{ $s['_i'] }})"><x-lucide-trash-2 aria-hidden="true" />{{ $remove($s['name']) }}</x-nq::context-menu.item>
                                        </x-nq::context-menu.content>
                                    </x-nq::context-menu>
                                @endforeach
                            </div>
                        @endif
                    </x-nq::card>
                @endforeach
            </div>
        </x-nq::tabs.panel>

        <x-nq::tabs.panel value="labels" class="mt-4 flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="max-w-prose text-body-sm text-muted-foreground">{{ $cfg['labelsBody'] }}</p>
                <x-nq::button variant="primary" x-on:click="openCreate('label')"><x-lucide-plus aria-hidden="true" />{{ $L('addLabel', 'New label', 'تصنيف جديد') }}</x-nq::button>
            </div>
            @if (count($labelList) === 0)
                <x-nq::states.empty icon="tag" :title="$L('emptyLabels', 'No labels yet', 'لا توجد تصنيفات بعد')" :description="$L('emptyLabelsBody', 'Labels help you find and group items.', 'تساعدك التصنيفات على إيجاد العناصر وتجميعها.')" />
            @else
                <x-nq::card class="gap-0 py-0">
                    <div role="list" class="flex flex-col">
                        @foreach ($labelList as $pos => $l)
                            @php $border = $pos === 0 ? '' : 'border-t border-border'; @endphp
                            <x-nq::context-menu>
                                <x-nq::context-menu.trigger role="listitem" class="{{ $rowClass }} {{ $border }}">
                                    <x-nq::badge variant="tag" :hue="$l['hue']">{{ $l['name'] }}</x-nq::badge>
                                    <span class="min-w-0 flex-1 text-caption text-muted-foreground">@if ($l['usage'] !== null){{ $usedBy((int) $l['usage']) }}@endif</span>
                                    <div class="flex items-center">
                                        <x-nq::button variant="ghost" size="icon-sm" :aria-label="$edit($l['name'])" x-on:click="openEdit('label', {{ $l['_i'] }})"><x-lucide-pencil aria-hidden="true" /></x-nq::button>
                                        <x-nq::button variant="ghost" size="icon-sm" :aria-label="$remove($l['name'])" x-on:click="askDelete('label', {{ $l['_i'] }})"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    </div>
                                </x-nq::context-menu.trigger>
                                <x-nq::context-menu.content>
                                    <x-nq::context-menu.item x-on:click="openEdit('label', {{ $l['_i'] }})"><x-lucide-pencil aria-hidden="true" />{{ $cfg['editLabel'] }}</x-nq::context-menu.item>
                                    <x-nq::context-menu.separator />
                                    <x-nq::context-menu.item variant="danger" x-on:click="askDelete('label', {{ $l['_i'] }})"><x-lucide-trash-2 aria-hidden="true" />{{ $remove($l['name']) }}</x-nq::context-menu.item>
                                </x-nq::context-menu.content>
                            </x-nq::context-menu>
                        @endforeach
                    </div>
                </x-nq::card>
            @endif
        </x-nq::tabs.panel>
    </x-nq::tabs>

    <x-nq::alert-dialog x-model="delOpen">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title><span x-text="delTitle"></span></x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description><span x-text="delBody"></span></x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                <x-nq::alert-dialog.cancel x-bind:disabled="delBusy ? '' : null">{{ $cancel }}</x-nq::alert-dialog.cancel>
                <x-nq::button type="button" variant="danger" x-on:click="confirmDelete()" x-bind:aria-busy="delBusy ? 'true' : null" x-bind:data-disabled="delBusy ? '' : null">
                    <x-nq::spinner x-show="delBusy" style="display: none" />
                    {{ $L('deleteConfirm', 'Delete', 'حذف') }}
                </x-nq::button>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>

    <x-nq::dialog x-model="editOpen">
        <x-nq::dialog.content>
            <form data-slot="status-label-edit" x-on:submit.prevent="submit()" class="flex flex-col gap-4" novalidate>
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="editTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="editBody"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::field x-model="nameBad">
                    <x-nq::field.label>{{ $L('name', 'Name', 'الاسم') }}</x-nq::field.label>
                    <x-nq::field.input x-model="draft.name" autocomplete="off" />
                    <x-nq::field.error><span x-text="nameMsg"></span></x-nq::field.error>
                    <x-nq::field.description x-show="! nameBad">{{ $fill($L('nameHint', 'Up to {n} characters.', 'حتى {n} حرفًا.'), ['n' => $nameMax]) }}</x-nq::field.description>
                </x-nq::field>
                <div class="flex flex-col gap-1.5" x-on:color-change="onColor($event)" x-effect="syncPicker($el)">
                    <span class="text-label text-foreground">{{ $L('colour', 'Colour', 'اللون') }}</span>
                    <x-nq::color-picker value="--nq-tag-blue" :allow-hex="false" :allow-native="false" :aria-label="$L('colour', 'Colour', 'اللون')" />
                </div>
                <div x-show="isStatus" class="contents">
                    <x-nq::field>
                        <x-nq::field.label>{{ $L('stageField', 'Stage', 'المرحلة') }}</x-nq::field.label>
                        <x-nq::select x-model="draft.stage" value="todo">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($stageNames as $stage => $stageName)
                                    <x-nq::select.item :value="$stage">{{ $stageName }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                </div>
                <div class="flex items-center gap-2 text-caption text-muted-foreground">
                    {{ $L('preview', 'Preview', 'معاينة') }}
                    <x-nq::badge variant="tag" hue="blue" x-bind:style="tagStyle(draft.hue)"><span x-text="previewName"></span></x-nq::badge>
                </div>
                <template x-if="formError !== ''">
                    <x-nq::alert tone="danger" role="alert"><span x-text="formError"></span></x-nq::alert>
                </template>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="editOpen = false" x-bind:disabled="busy ? '' : null">{{ $cancel }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
                        <x-nq::spinner x-show="busy" style="display: none" />
                        <span x-text="submitLabel"></span>
                    </x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>

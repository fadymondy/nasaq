{{-- <x-nq::section-board :sections="$sections" :models="[['value' => 'fast', 'label' => 'Fast']]" :columns="2" addable x-effect="editing = on"> </x-nq::section-board>
     An ordered set of sections, each produced by a prompt, a model and a few settings. View mode shows only the content; edit mode lets people reorder (drag the handle with native pointer events, or focus it and use the arrow keys / Home / End),
     edit each section in a dialog and remove it.
     sections: each ['id', 'title', 'badge', 'prompt', 'model' (a value from models), 'settings' => ['key' => 'value'], 'content' (plain text shown in view mode)]. sections is x-modelable (x-model="$wire.sections").
     models: [['value', 'label']] offered in the editor. editing: start in edit mode; switch it later with x-effect="editing = on" on the component. columns: 1 (default) or 2 (two columns from the sm breakpoint).
     addable: shows an Add section button in edit mode; it fires nq-add. heading-as: the title's heading level (h3 by default). label: names the list.
     A "change" event ({ sections }) bubbles after every move, edit and removal; listen with x-on:change="sections = $event.detail.sections". Needs the Alpine runtime (@nasaqScripts). --}}
@props(['sections' => [], 'models' => [], 'editing' => false, 'columns' => 1, 'addable' => false, 'headingAs' => 'h3', 'label' => null])
@php
    $options = ['models' => array_values((array) $models), 'editing' => (bool) $editing, 'addable' => (bool) $addable];
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $head = in_array($headingAs, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], true) ? $headingAs : 'h3';
    $btn = 'text-muted-foreground hover:text-nq-danger-text';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'section-board') }}" x-data="nqSectionBoard(@js(array_values((array) $sections)), @js((object) $options))" x-modelable="sections" x-id="['nq-section-board']"
    :data-editing="editing ? 'true' : undefined"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <p x-show="editing" x-cloak style="display: none" :id="$id('nq-section-board')" class="sr-only">{{ $T('Drag, or press the arrow keys, Home or End, to move a section.', 'اسحب، أو استخدم مفاتيح الأسهم أو Home أو End، لنقل القسم.') }}</p>

    <template x-if="sections.length === 0">
        <x-nq::states.empty icon="layout-list" :title="$T('No sections', 'لا توجد أقسام')" :description="$T('Add a section to start building this page.', 'أضف قسمًا لبدء بناء هذه الصفحة.')" />
    </template>
    <ol x-show="sections.length" x-cloak style="display: none" aria-label="{{ $label ?? $T('Sections', 'الأقسام') }}" class="{{ \Nasaq\Cn::merge('grid gap-3', (int) $columns === 2 ? 'sm:grid-cols-2' : '') }}">
        <template x-for="(section, index) in sections" :key="section.id">
            <li data-slot="section-board-section" :data-section="section.id" :data-dragging="isDragging(index) ? 'true' : undefined" :data-over="isOver(index) ? '' : undefined"
                :aria-labelledby="$id('nq-section-board', section.id)" :style="sectionStyle(index)"
                class="relative flex min-w-0 flex-col rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating data-over:border-nq-focus">
                <div class="flex min-h-control items-center gap-1 px-2 pt-2">
                    <template x-if="reorderable">
                        <button type="button" :aria-label="$nq.t('Move ' + section.title, 'نقل ' + section.title)" :title="$nq.t('Move ' + section.title, 'نقل ' + section.title)"
                            :aria-describedby="$id('nq-section-board')" aria-keyshortcuts="ArrowUp ArrowDown Home End"
                            x-on:keydown="onHandleKey($event, index)" x-on:pointerdown="startDrag($event, index)"
                            class="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing [&_svg]:size-4">
                            <x-lucide-grip-vertical aria-hidden="true" />
                        </button>
                    </template>
                    <{{ $head }} :id="$id('nq-section-board', section.id)" dir="auto" :class="reorderable ? '' : 'ps-2'" class="min-w-0 flex-1 truncate text-label text-foreground" x-text="section.title"></{{ $head }}>
                    <span x-show="editing" x-cloak style="display: none" class="sr-only" x-text="n(index + 1)"></span>
                    <template x-if="section.badge">
                        <x-nq::badge variant="neutral"><span x-text="section.badge"></span></x-nq::badge>
                    </template>
                    <template x-if="editing">
                        <div class="contents">
                            <x-nq::button type="button" variant="ghost" size="icon-sm" ::aria-label="$nq.t('Edit ' + section.title, 'تعديل ' + section.title)" ::title="$nq.t('Edit ' + section.title, 'تعديل ' + section.title)" aria-haspopup="dialog" x-on:click="startEdit(section)">
                                <x-lucide-settings-2 aria-hidden="true" />
                            </x-nq::button>
                            <x-nq::button type="button" variant="ghost" size="icon-sm" class="{{ $btn }}" ::aria-label="$nq.t('Remove ' + section.title, 'حذف ' + section.title)" ::title="$nq.t('Remove ' + section.title, 'حذف ' + section.title)" x-on:click="removeSection(section)">
                                <x-lucide-trash-2 aria-hidden="true" />
                            </x-nq::button>
                        </div>
                    </template>
                </div>

                <div data-slot="section-board-content" :inert="editing ? '' : undefined" class="min-w-0 flex-1 px-4 pt-2 pb-4 text-body-sm text-muted-foreground">
                    <span x-show="section.content" x-text="section.content"></span>
                    <span x-show="!section.content" class="italic">{{ $T('Nothing to show yet.', 'لا شيء لعرضه بعد.') }}</span>
                </div>

                <template x-if="hasFooter(section)">
                    <div data-slot="section-board-prompt" class="flex min-w-0 items-center gap-2 border-t border-border px-4 py-2 text-caption text-muted-foreground">
                        <x-lucide-sparkles aria-hidden="true" class="size-3.5 shrink-0" />
                        <template x-if="modelName(section.model)">
                            <x-nq::badge variant="outline" class="shrink-0"><span x-text="modelName(section.model)"></span></x-nq::badge>
                        </template>
                        <span x-show="section.prompt" dir="auto" class="min-w-0 flex-1 truncate font-mono" x-text="section.prompt"></span>
                    </div>
                </template>
            </li>
        </template>
    </ol>

    <template x-if="editing && addable">
        <x-nq::button type="button" variant="secondary" class="w-full border-dashed" x-on:click="addSection()">
            <x-lucide-plus aria-hidden="true" />
            {{ $T('Add section', 'إضافة قسم') }}
        </x-nq::button>
    </template>

    <x-nq::dialog x-model="editOpen">
        <x-nq::dialog.content class="max-w-lg">
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="editTitle()"></span></x-nq::dialog.title>
                <x-nq::dialog.description>{{ $T('The prompt and model that generate this section, and any settings it needs.', 'التوجيه والنموذج اللذان ينتجان هذا القسم، وأي إعدادات يحتاجها.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <form class="flex flex-col gap-4" x-on:submit.prevent="submitEdit()">
                <div class="grid gap-3 sm:grid-cols-[1fr_10rem]">
                    <x-nq::field>
                        <x-nq::field.label>{{ $T('Title', 'العنوان') }}</x-nq::field.label>
                        <x-nq::field.input x-model="dTitle" ::aria-invalid="titleInvalid ? 'true' : undefined" />
                        <p x-show="titleInvalid" x-cloak style="display: none" role="alert" class="text-caption text-nq-danger-text">{{ $T('Give the section a title.', 'أعطِ القسم عنوانًا.') }}</p>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $T('Tag', 'الوسم') }}</x-nq::field.label>
                        <x-nq::field.input x-model="dBadge" />
                    </x-nq::field>
                </div>
                <x-nq::field>
                    <x-nq::field.label>{{ $T('Prompt', 'التوجيه') }}</x-nq::field.label>
                    <x-nq::field.textarea dir="auto" rows="4" x-model="dPrompt" placeholder="{{ $T('What should this section show? Write it as an instruction.', 'ماذا يعرض هذا القسم؟ اكتبه كتعليمات.') }}" />
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $T('Model', 'النموذج') }}</x-nq::field.label>
                    <x-nq::select x-model="dModel">
                        <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                        <x-nq::select.content>
                            <template x-for="m in modelItems" :key="m.value">
                                <x-nq::select.item value-expr="m.value"><span x-text="m.label"></span></x-nq::select.item>
                            </template>
                        </x-nq::select.content>
                    </x-nq::select>
                </x-nq::field>
                <fieldset class="flex flex-col gap-2">
                    <legend class="mb-1.5 text-label text-foreground">{{ $T('Settings', 'الإعدادات') }}</legend>
                    <template x-for="(row, i) in rows" :key="i">
                        <div data-slot="section-board-setting" class="flex items-center gap-2">
                            <x-nq::field.input ltr x-model="row.key" aria-label="{{ $T('Key', 'المفتاح') }}" placeholder="{{ $T('Key', 'المفتاح') }}" ::aria-invalid="dupes.includes(row.key.trim()) ? 'true' : undefined" />
                            <x-nq::field.input x-model="row.value" aria-label="{{ $T('Value', 'القيمة') }}" placeholder="{{ $T('Value', 'القيمة') }}" />
                            <x-nq::button type="button" variant="ghost" size="icon-sm" class="{{ $btn }}" ::aria-label="row.key.trim() ? $nq.t('Remove setting ' + row.key.trim(), 'حذف الإعداد ' + row.key.trim()) : $nq.t('Remove setting', 'حذف الإعداد')" x-on:click="dropSetting(i)">
                                <x-lucide-x aria-hidden="true" />
                            </x-nq::button>
                        </div>
                    </template>
                    <template x-for="k in dupes" :key="k">
                        <p role="alert" class="text-caption text-nq-danger-text" x-text="dupText(k)"></p>
                    </template>
                    <x-nq::button type="button" variant="ghost" size="sm" class="w-fit" x-on:click="addSetting()">
                        <x-lucide-plus aria-hidden="true" />
                        {{ $T('Add setting', 'إضافة إعداد') }}
                    </x-nq::button>
                </fieldset>
            </form>
            <x-nq::dialog.footer>
                <x-nq::button type="button" variant="ghost" x-on:click="editOpen = false">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                <x-nq::button type="button" variant="primary" ::disabled="cannotSave" x-on:click="submitEdit()">{{ $T('Save', 'حفظ') }}</x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <div aria-live="polite" role="status" class="sr-only" x-text="announcement"></div>
</div>

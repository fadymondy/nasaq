{{-- <x-nq::landing-page-editor :page="$page" @nq-landing-save="$event.detail.promise = api.save($event.detail.page)" @nq-landing-publish="$event.detail.promise = api.publish($event.detail.page)" />
     A landing page editor in three panes: an outline of sections (add, reorder, hide, duplicate, delete), a live preview at desktop or phone width,
     and a form for the selected section or the page (address, search title and description, direction). Below lg the panes become tabs.
     Presentational: you own storage. Needs the Alpine runtime (@nasaqScripts).
     page: ['title', 'slug', 'seoTitle', 'seoDescription', 'dir' (ltr|rtl), 'status' (draft|published), 'sections' => [['id', 'type' (hero|features|faq|cta|text), 'visible', 'data' => [...]]]].
       hero data: eyebrow, headline, subheadline, primaryLabel, primaryHref, secondaryLabel, secondaryHref, align (start|center).
       features data: title, subtitle, items [id, title, description]. faq data: title, items [id, question, answer]. cta data: title, body, buttonLabel, buttonHref. text data: html.
     page is x-modelable: x-model="page" reads and writes the whole page object. section-types: which types the Add menu offers (all five).
     can-save, can-publish (true): hide the Save draft / Publish button. labels: override any string of the English table below ('types' and 'blockers' are nested).
     Events (bubbling): nq-landing-save { page }, nq-landing-publish { page } (page.status is "published"). Set event.detail.promise to a Promise (or one resolving to { error }).
     Publish stays disabled while the page has no title, a bad address, nothing visible or an unsafe button link. Text sections are an HTML textarea (the rich text editor is not wired here).
     Features and FAQ items are reordered with the up / down buttons on each row. --}}
@props(['page' => [], 'sectionTypes' => ['hero', 'features', 'faq', 'cta', 'text'], 'canSave' => true, 'canPublish' => true, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $uid = 'nq-lpe-'.\Illuminate\Support\Str::random(6);
    $en = [
            'editor' => 'Landing page editor',
            'sections' => 'Sections',
            'addSection' => 'Add section',
            'noSections' => 'No sections yet',
            'noSectionsHint' => 'Add a hero to start the page.',
            'types' => [
                'hero' => 'Hero',
                'features' => 'Features',
                'faq' => 'FAQ',
                'cta' => 'Call to action',
                'text' => 'Text',
            ],
            'hidden' => 'Hidden',
            'sectionActions' => 'Actions for {n}',
            'moveUp' => 'Move up',
            'moveDown' => 'Move down',
            'hide' => 'Hide section',
            'show' => 'Show section',
            'duplicate' => 'Duplicate',
            'remove' => 'Delete',
            'section' => 'Section',
            'page' => 'Page',
            'edit' => 'Edit',
            'preview' => 'Preview',
            'desktop' => 'Desktop',
            'mobile' => 'Mobile',
            'selectHint' => 'Select a section to edit it.',
            'pageTitle' => 'Page title',
            'slug' => 'Address',
            'slugHint' => 'Lowercase letters, numbers and hyphens.',
            'slugInvalid' => 'Use lowercase letters, numbers and hyphens only.',
            'seoTitle' => 'Search title',
            'seoDescription' => 'Search description',
            'characters' => '{n} of {max} characters',
            'direction' => 'Page direction',
            'ltr' => 'Left to right',
            'rtl' => 'Right to left',
            'eyebrow' => 'Small label above',
            'headline' => 'Headline',
            'subheadline' => 'Subheadline',
            'primaryLabel' => 'Main button text',
            'primaryHref' => 'Main button link',
            'secondaryLabel' => 'Second button text',
            'secondaryHref' => 'Second button link',
            'align' => 'Alignment',
            'alignStart' => 'Start',
            'alignCenter' => 'Center',
            'title' => 'Title',
            'subtitle' => 'Subtitle',
            'items' => 'Items',
            'itemTitle' => 'Title',
            'itemDescription' => 'Description',
            'feature' => 'Feature {n}',
            'question' => 'Question',
            'answer' => 'Answer',
            'faqItem' => 'Question {n}',
            'addFeature' => 'Add feature',
            'addQuestion' => 'Add question',
            'body' => 'Text',
            'buttonLabel' => 'Button text',
            'buttonHref' => 'Button link',
            'linkInvalid' => 'Use https://, a path starting with /, or #.',
            'draft' => 'Draft',
            'published' => 'Published',
            'unsaved' => 'Unsaved changes',
            'saveDraft' => 'Save draft',
            'publish' => 'Publish',
            'update' => 'Publish changes',
            'saved' => 'Draft saved.',
            'publishedOk' => 'Page published.',
            'failed' => 'Something went wrong. Try again.',
            'blockers' => [
                'title' => 'Give the page a title.',
                'slug' => 'Set a valid address for the page.',
                'sections' => 'Show at least one section.',
                'href' => 'Fix the invalid button links.',
            ],
            'previewLabel' => 'Page preview',
            'previewSelect' => 'Edit {n}',
            'untitled' => 'Untitled page',
        ];
    $arabic = [
            'editor' => 'محرر صفحة الهبوط',
            'sections' => 'الأقسام',
            'addSection' => 'إضافة قسم',
            'noSections' => 'لا توجد أقسام بعد',
            'noSectionsHint' => 'أضف قسمًا رئيسيًا لتبدأ الصفحة.',
            'types' => [
                'hero' => 'الواجهة الرئيسية',
                'features' => 'المزايا',
                'faq' => 'الأسئلة الشائعة',
                'cta' => 'دعوة لاتخاذ إجراء',
                'text' => 'نص',
            ],
            'hidden' => 'مخفي',
            'sectionActions' => 'إجراءات {n}',
            'moveUp' => 'نقل لأعلى',
            'moveDown' => 'نقل لأسفل',
            'hide' => 'إخفاء القسم',
            'show' => 'إظهار القسم',
            'duplicate' => 'تكرار',
            'remove' => 'حذف',
            'section' => 'القسم',
            'page' => 'الصفحة',
            'edit' => 'تحرير',
            'preview' => 'معاينة',
            'desktop' => 'حاسوب',
            'mobile' => 'جوال',
            'selectHint' => 'اختر قسمًا لتحريره.',
            'pageTitle' => 'عنوان الصفحة',
            'slug' => 'العنوان',
            'slugHint' => 'حروف لاتينية صغيرة وأرقام وشرطات.',
            'slugInvalid' => 'استخدم حروفًا لاتينية صغيرة وأرقامًا وشرطات فقط.',
            'seoTitle' => 'عنوان البحث',
            'seoDescription' => 'وصف البحث',
            'characters' => '{n} من {max} حرفًا',
            'direction' => 'اتجاه الصفحة',
            'ltr' => 'من اليسار إلى اليمين',
            'rtl' => 'من اليمين إلى اليسار',
            'eyebrow' => 'عبارة صغيرة أعلاه',
            'headline' => 'العنوان الرئيسي',
            'subheadline' => 'العنوان الفرعي',
            'primaryLabel' => 'نص الزر الرئيسي',
            'primaryHref' => 'رابط الزر الرئيسي',
            'secondaryLabel' => 'نص الزر الثاني',
            'secondaryHref' => 'رابط الزر الثاني',
            'align' => 'المحاذاة',
            'alignStart' => 'البداية',
            'alignCenter' => 'الوسط',
            'title' => 'العنوان',
            'subtitle' => 'العنوان الفرعي',
            'items' => 'العناصر',
            'itemTitle' => 'العنوان',
            'itemDescription' => 'الوصف',
            'feature' => 'الميزة {n}',
            'question' => 'السؤال',
            'answer' => 'الإجابة',
            'faqItem' => 'السؤال {n}',
            'addFeature' => 'إضافة ميزة',
            'addQuestion' => 'إضافة سؤال',
            'body' => 'النص',
            'buttonLabel' => 'نص الزر',
            'buttonHref' => 'رابط الزر',
            'linkInvalid' => 'استخدم https:// أو مسارًا يبدأ بـ / أو #.',
            'draft' => 'مسودة',
            'published' => 'منشورة',
            'unsaved' => 'تغييرات غير محفوظة',
            'saveDraft' => 'حفظ المسودة',
            'publish' => 'نشر',
            'update' => 'نشر التغييرات',
            'saved' => 'تم حفظ المسودة.',
            'publishedOk' => 'تم نشر الصفحة.',
            'failed' => 'حدث خطأ. حاول مرة أخرى.',
            'blockers' => [
                'title' => 'أعطِ الصفحة عنوانًا.',
                'slug' => 'حدّد عنوانًا صالحًا للصفحة.',
                'sections' => 'أظهر قسمًا واحدًا على الأقل.',
                'href' => 'صحّح روابط الأزرار غير الصالحة.',
            ],
            'previewLabel' => 'معاينة الصفحة',
            'previewSelect' => 'تحرير {n}',
            'untitled' => 'صفحة بلا عنوان',
        ];
    $base = $ar ? $arabic : $en;
    $t = array_merge($base, (array) $labels);
    $t['types'] = array_merge($base['types'], (array) ($labels['types'] ?? []));
    $t['blockers'] = array_merge($base['blockers'], (array) ($labels['blockers'] ?? []));
    $options = [
        'page' => (object) (array) $page, 'sectionTypes' => array_values((array) $sectionTypes), 'locale' => $locale,
        'canSave' => (bool) $canSave, 'canPublish' => (bool) $canPublish, 'labels' => $t,
    ];
    $icons = ['hero' => 'rocket', 'features' => 'sparkles', 'faq' => 'circle-help', 'cta' => 'megaphone', 'text' => 'type'];
    $err = 'text-caption text-nq-danger-text';
    $heroFields = [
        ['eyebrow', 'eyebrow', false, false], ['headline', 'headline', true, false], ['subheadline', 'subheadline', true, false],
        ['primaryLabel', 'primaryLabel', false, false], ['primaryHref', 'primaryHref', false, true],
        ['secondaryLabel', 'secondaryLabel', false, false], ['secondaryHref', 'secondaryHref', false, true],
    ];
    $ctaFields = [['title', 'title', false, false], ['body', 'body', true, false], ['buttonLabel', 'buttonLabel', false, false], ['buttonHref', 'buttonHref', false, true]];
    $tabBtn = 'inline-flex h-control-sm items-center rounded-control px-2.5 text-label';
@endphp
<div data-slot="landing-page-editor" role="group" aria-label="{{ $t['editor'] }}" x-data="nqLandingPageEditor({!! \Illuminate\Support\Js::from($options) !!})" x-modelable="page" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center gap-2">
        <div class="flex min-w-0 items-center gap-2">
            <span class="truncate text-label text-foreground" x-text="page.title || labels.untitled"></span>
            <template x-if="page.status === 'published'"><x-nq::badge variant="success">{{ $t['published'] }}</x-nq::badge></template>
            <template x-if="page.status !== 'published'"><x-nq::badge variant="neutral">{{ $t['draft'] }}</x-nq::badge></template>
            <span x-show="dirty" style="display: none" class="text-caption text-muted-foreground">{{ $t['unsaved'] }}</span>
        </div>
        <div class="ms-auto flex flex-wrap items-center gap-2">
            <div role="group" aria-label="{{ $t['preview'] }}" class="inline-flex gap-0.5 rounded-control bg-nq-surface-soft p-0.5 max-lg:hidden">
                <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['desktop'] }}" x-bind:variant="device === 'desktop' ? 'secondary' : 'ghost'" x-bind:aria-pressed="device === 'desktop' ? 'true' : 'false'" x-on:click="device = 'desktop'"><x-nq::icon name="monitor" aria-hidden="true" class="size-4" /></x-nq::button>
                <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['mobile'] }}" x-bind:aria-pressed="device === 'mobile' ? 'true' : 'false'" x-on:click="device = 'mobile'"><x-nq::icon name="smartphone" aria-hidden="true" class="size-4" /></x-nq::button>
            </div>
            <template x-if="canSave">
                <x-nq::button x-on:click="run('save')" x-bind:aria-busy="busy === 'save' ? 'true' : null" x-bind:disabled="! dirty || busy ? '' : null">
                    <span x-show="busy === 'save'" style="display: none"><x-nq::spinner /></span>
                    {{ $t['saveDraft'] }}
                </x-nq::button>
            </template>
            <template x-if="canPublish">
                <x-nq::button variant="primary" x-on:click="run('publish')" x-bind:aria-busy="busy === 'publish' ? 'true' : null" x-bind:disabled="publishDisabled || busy === 'publish' ? '' : null">
                    <span x-show="busy === 'publish'" style="display: none"><x-nq::spinner /></span>
                    <x-nq::icon name="rocket" aria-hidden="true" />
                    <span x-text="page.status === 'published' ? labels.update : labels.publish"></span>
                </x-nq::button>
            </template>
        </div>
    </div>
    <template x-if="message && message.tone === 'danger'"><x-nq::alert tone="danger"><span x-text="message.text"></span></x-nq::alert></template>
    <template x-if="message && message.tone === 'success'"><x-nq::alert tone="success"><span x-text="message.text"></span></x-nq::alert></template>
    <template x-if="canPublish && blockers.length > 0">
        <ul aria-label="{{ $t['publish'] }}" class="flex flex-col gap-0.5 text-caption text-muted-foreground">
            <template x-for="b in blockerTexts" x-bind:key="b"><li x-text="b"></li></template>
        </ul>
    </template>

    <div class="flex gap-1 lg:hidden" role="tablist" aria-label="{{ $t['editor'] }}">
        @foreach (['sections' => 'sections', 'edit' => 'edit', 'preview' => 'preview'] as $k => $l)
            <x-nq::button type="button" role="tab" size="sm" x-bind:variant="pane === '{{ $k }}' ? 'secondary' : 'ghost'" x-bind:aria-selected="pane === '{{ $k }}' ? 'true' : 'false'" x-on:click="pane = '{{ $k }}'">{{ $t[$l] }}</x-nq::button>
        @endforeach
    </div>

    <div class="grid min-w-0 items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_20rem]">
        {{-- Outline --}}
        <section aria-label="{{ $t['sections'] }}" class="flex min-w-0 flex-col gap-2 max-lg:[&[data-pane=edit]]:hidden max-lg:[&[data-pane=preview]]:hidden" x-bind:data-pane="pane">
            <div class="flex items-center justify-between gap-2">
                <h3 class="text-label text-foreground">{{ $t['sections'] }}</h3>
                <x-nq::dropdown-menu>
                    <x-nq::dropdown-menu.trigger><x-nq::icon name="plus" aria-hidden="true" />{{ $t['addSection'] }}</x-nq::dropdown-menu.trigger>
                    <x-nq::dropdown-menu.content align="end" class="min-w-48">
                        @foreach ((array) $sectionTypes as $type)
                            <x-nq::dropdown-menu.item x-on:click="add('{{ $type }}')"><x-nq::icon :name="$icons[$type]" aria-hidden="true" />{{ $t['types'][$type] }}</x-nq::dropdown-menu.item>
                        @endforeach
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
            </div>
            <template x-if="page.sections.length === 0">
                <x-nq::states.empty icon="layout-template" :title="$t['noSections']" :description="$t['noSectionsHint']" />
            </template>
            <ol class="flex flex-col gap-1.5">
                <template x-for="(s, i) in page.sections" x-bind:key="s.id">
                    <li class="flex items-center gap-1 rounded-control border bg-card ps-1" x-bind:data-active="s.id === selectedId ? '' : null" x-bind:class="s.id === selectedId ? 'border-nq-focus' : 'border-border'">
                        <button type="button" x-bind:aria-current="s.id === selectedId ? 'true' : null" x-on:click="select(s.id)"
                            class="flex min-w-0 flex-1 items-center gap-2 rounded-control p-2 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
                            x-bind:class="s.visible ? '' : 'opacity-60'">
                            @foreach ($icons as $type => $icon)
                                <template x-if="s.type === '{{ $type }}'"><x-nq::icon name="{{ $icon }}" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" /></template>
                            @endforeach
                            <span class="flex min-w-0 flex-col">
                                <span class="flex items-center gap-1.5 text-label text-foreground">
                                    <span x-text="typeName(s.type)"></span>
                                    <template x-if="! s.visible"><x-nq::icon name="eye-off" aria-label="{{ $t['hidden'] }}" class="size-3 text-muted-foreground" /></template>
                                </span>
                                <span dir="auto" class="truncate text-caption text-muted-foreground" x-text="summary(s)"></span>
                            </span>
                        </button>
                        <x-nq::dropdown-menu>
                            <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" x-bind:aria-label="fmt('sectionActions', { n: typeName(s.type) })"><x-nq::icon name="more-horizontal" aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                            <x-nq::dropdown-menu.content align="end" class="min-w-44">
                                <x-nq::dropdown-menu.item x-on:click="move(i, -1)" x-bind:data-disabled="i === 0 ? '' : null"><x-nq::icon name="arrow-up" aria-hidden="true" />{{ $t['moveUp'] }}</x-nq::dropdown-menu.item>
                                <x-nq::dropdown-menu.item x-on:click="move(i, 1)" x-bind:data-disabled="i === page.sections.length - 1 ? '' : null"><x-nq::icon name="arrow-down" aria-hidden="true" />{{ $t['moveDown'] }}</x-nq::dropdown-menu.item>
                                <x-nq::dropdown-menu.item x-on:click="toggleVisible(s.id)">
                                    <x-nq::icon name="eye-off" aria-hidden="true" />
                                    <span x-text="s.visible ? labels.hide : labels.show"></span>
                                </x-nq::dropdown-menu.item>
                                <x-nq::dropdown-menu.item x-on:click="duplicate(i)"><x-nq::icon name="copy" aria-hidden="true" />{{ $t['duplicate'] }}</x-nq::dropdown-menu.item>
                                <x-nq::dropdown-menu.separator />
                                <x-nq::dropdown-menu.item variant="danger" x-on:click="remove(s.id)"><x-nq::icon name="trash-2" aria-hidden="true" />{{ $t['remove'] }}</x-nq::dropdown-menu.item>
                            </x-nq::dropdown-menu.content>
                        </x-nq::dropdown-menu>
                    </li>
                </template>
            </ol>
        </section>

        {{-- Preview --}}
        <section aria-label="{{ $t['preview'] }}" class="min-w-0 max-lg:[&[data-pane=sections]]:hidden max-lg:[&[data-pane=edit]]:hidden" x-bind:data-pane="pane">
            <div class="mb-2 flex items-center justify-between gap-2 lg:hidden">
                <span class="text-label text-foreground">{{ $t['preview'] }}</span>
                <div role="group" aria-label="{{ $t['preview'] }}" class="inline-flex gap-0.5 rounded-control bg-nq-surface-soft p-0.5">
                    <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['desktop'] }}" x-bind:variant="device === 'desktop' ? 'secondary' : 'ghost'" x-on:click="device = 'desktop'"><x-nq::icon name="monitor" aria-hidden="true" class="size-4" /></x-nq::button>
                    <x-nq::button type="button" size="icon-sm" aria-label="{{ $t['mobile'] }}" x-bind:variant="device === 'mobile' ? 'secondary' : 'ghost'" x-on:click="device = 'mobile'"><x-nq::icon name="smartphone" aria-hidden="true" class="size-4" /></x-nq::button>
                </div>
            </div>
            <div class="flex justify-center rounded-card border border-border bg-secondary p-3">
                <div role="region" aria-label="{{ $t['previewLabel'] }}" x-bind:dir="page.dir" x-bind:data-device="device"
                    class="@container w-full overflow-hidden rounded-card border border-border bg-background" x-bind:class="device === 'mobile' ? 'max-w-[390px]' : 'max-w-[960px]'">
                    <template x-if="visibleSections.length === 0"><p class="p-10 text-center text-body-sm text-muted-foreground">{{ $t['noSectionsHint'] }}</p></template>
                    {{-- The preview is a pointer shortcut; the Sections list is the keyboard route to every section. --}}
                    <template x-for="s in visibleSections" x-bind:key="s.id">
                        <div x-bind:data-selected="s.id === selectedId ? '' : null" x-on:click="select(s.id)" x-bind:title="fmt('previewSelect', { n: typeName(s.type) })"
                            class="relative cursor-pointer outline-offset-[-2px] hover:outline hover:outline-1 hover:outline-nq-line-strong data-selected:outline data-selected:outline-2 data-selected:outline-nq-focus">
                            <template x-if="s.type === 'hero'">
                                <div class="flex flex-col gap-4 px-6 py-12 @lg:py-16" x-bind:class="s.data.align === 'center' ? 'items-center text-center' : 'items-start text-start'">
                                    <template x-if="s.data.eyebrow"><span class="text-caption uppercase tracking-wide text-muted-foreground" x-text="s.data.eyebrow"></span></template>
                                    <h2 class="max-w-2xl text-h1 text-foreground @lg:text-display" x-text="s.data.headline"></h2>
                                    <p class="max-w-xl text-body text-muted-foreground" x-text="s.data.subheadline"></p>
                                    <div class="flex flex-wrap gap-2 pt-2" x-bind:class="s.data.align === 'center' ? 'justify-center' : ''">
                                        <template x-if="s.data.primaryLabel"><x-nq::button variant="primary" size="lg" tabindex="-1"><span x-text="s.data.primaryLabel"></span></x-nq::button></template>
                                        <template x-if="s.data.secondaryLabel"><x-nq::button size="lg" tabindex="-1"><span x-text="s.data.secondaryLabel"></span></x-nq::button></template>
                                    </div>
                                </div>
                            </template>
                            <template x-if="s.type === 'features'">
                                <div class="flex flex-col gap-6 border-t border-border px-6 py-10">
                                    <div class="flex flex-col gap-1 text-start">
                                        <h3 class="text-h2 text-foreground" x-text="s.data.title"></h3>
                                        <template x-if="s.data.subtitle"><p class="text-body text-muted-foreground" x-text="s.data.subtitle"></p></template>
                                    </div>
                                    <ul class="grid gap-4 @lg:grid-cols-3">
                                        <template x-for="item in s.data.items" x-bind:key="item.id">
                                            <li class="flex flex-col gap-1 rounded-card border border-border bg-card p-4 text-start">
                                                <span class="flex size-8 items-center justify-center rounded-control bg-secondary"><x-nq::icon name="sparkles" aria-hidden="true" class="size-4 text-muted-foreground" /></span>
                                                <span class="pt-1 text-label text-foreground" x-text="item.title"></span>
                                                <span class="text-body-sm text-muted-foreground" x-text="item.description"></span>
                                            </li>
                                        </template>
                                    </ul>
                                </div>
                            </template>
                            <template x-if="s.type === 'faq'">
                                <div class="flex flex-col gap-4 border-t border-border px-6 py-10 text-start">
                                    <h3 class="text-h2 text-foreground" x-text="s.data.title"></h3>
                                    <dl class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                                        <template x-for="item in s.data.items" x-bind:key="item.id">
                                            <div class="flex flex-col gap-1 p-4">
                                                <dt class="text-label text-foreground" x-text="item.question"></dt>
                                                <dd class="text-body-sm text-muted-foreground" x-text="item.answer"></dd>
                                            </div>
                                        </template>
                                    </dl>
                                </div>
                            </template>
                            <template x-if="s.type === 'cta'">
                                <div class="px-6 py-10">
                                    <div class="flex flex-col items-center gap-3 rounded-card border border-border bg-secondary px-6 py-10 text-center">
                                        <h3 class="text-h2 text-foreground" x-text="s.data.title"></h3>
                                        <p class="max-w-md text-body text-muted-foreground" x-text="s.data.body"></p>
                                        <template x-if="s.data.buttonLabel"><x-nq::button variant="primary" size="lg" tabindex="-1"><span x-text="s.data.buttonLabel"></span></x-nq::button></template>
                                    </div>
                                </div>
                            </template>
                            <template x-if="s.type === 'text'">
                                {{-- The HTML is the page author's own: render it where the author wrote it, never user-submitted content from elsewhere. --}}
                                <div class="border-t border-border px-6 py-8 text-start text-body text-nq-fg-body [&_a]:underline [&_h2]:text-h2 [&_h3]:text-h3 [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:mb-3 [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:ps-6 [&_ul]:ps-6" x-html="s.data.html"></div>
                            </template>
                        </div>
                    </template>
                </div>
            </div>
        </section>

        {{-- Inspector --}}
        <section aria-label="{{ $t['edit'] }}" class="flex min-w-0 flex-col gap-4 max-lg:[&[data-pane=sections]]:hidden max-lg:[&[data-pane=preview]]:hidden" x-bind:data-pane="pane">
            <div class="flex gap-1" role="tablist">
                <x-nq::button type="button" role="tab" size="sm" x-bind:variant="panel === 'section' ? 'secondary' : 'ghost'" x-bind:aria-selected="panel === 'section' ? 'true' : 'false'" x-on:click="panel = 'section'">{{ $t['section'] }}</x-nq::button>
                <x-nq::button type="button" role="tab" size="sm" x-bind:variant="panel === 'page' ? 'secondary' : 'ghost'" x-bind:aria-selected="panel === 'page' ? 'true' : 'false'" x-on:click="panel = 'page'">{{ $t['page'] }}</x-nq::button>
            </div>

            {{-- Page settings --}}
            <template x-if="panel === 'page'">
                <div class="flex flex-col gap-4">
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['pageTitle'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="page.title" dir="auto" />
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['slug'] }}</x-nq::field.label>
                        <x-nq::field.input ltr x-model="page.slug" x-on:input="normalizeSlug()" />
                        <template x-if="! slugInvalid"><x-nq::field.description>{{ $t['slugHint'] }}</x-nq::field.description></template>
                        <template x-if="slugInvalid"><p role="alert" class="{{ $err }}">{{ $t['slugInvalid'] }}</p></template>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['seoTitle'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="page.seoTitle" dir="auto" />
                        <p class="text-body-sm text-muted-foreground" x-text="seoTitleCount"></p>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['seoDescription'] }}</x-nq::field.label>
                        <x-nq::field.textarea x-model="page.seoDescription" dir="auto" rows="3" />
                        <p class="text-body-sm text-muted-foreground" x-text="seoDescriptionCount"></p>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['direction'] }}</x-nq::field.label>
                        <x-nq::select x-model="page.dir">
                            <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                <x-nq::select.item value="ltr">{{ $t['ltr'] }}</x-nq::select.item>
                                <x-nq::select.item value="rtl">{{ $t['rtl'] }}</x-nq::select.item>
                            </x-nq::select.content>
                        </x-nq::select>
                    </x-nq::field>
                </div>
            </template>

            {{-- Section form --}}
            <template x-if="panel !== 'page' && selected">
                <div class="flex flex-col gap-4">
                    <h3 class="text-label text-foreground" x-text="typeName(selected.type)"></h3>

                    <template x-if="selected.type === 'hero'">
                        <div class="flex flex-col gap-4">
                            @foreach ($heroFields as [$key, $label, $multi, $link])
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t[$label] }}</x-nq::field.label>
                                    @if ($multi)
                                        <x-nq::field.textarea x-model="selected.data.{{ $key }}" dir="auto" rows="3" />
                                    @elseif ($link)
                                        <x-nq::field.input ltr x-model="selected.data.{{ $key }}" />
                                        <template x-if="linkInvalid(selected.data.{{ $key }})"><p role="alert" class="{{ $err }}">{{ $t['linkInvalid'] }}</p></template>
                                    @else
                                        <x-nq::field.input x-model="selected.data.{{ $key }}" dir="auto" />
                                    @endif
                                </x-nq::field>
                            @endforeach
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['align'] }}</x-nq::field.label>
                                <x-nq::select x-model="selected.data.align">
                                    <x-nq::select.trigger><x-nq::select.value /></x-nq::select.trigger>
                                    <x-nq::select.content>
                                        <x-nq::select.item value="start">{{ $t['alignStart'] }}</x-nq::select.item>
                                        <x-nq::select.item value="center">{{ $t['alignCenter'] }}</x-nq::select.item>
                                    </x-nq::select.content>
                                </x-nq::select>
                            </x-nq::field>
                        </div>
                    </template>

                    <template x-if="selected.type === 'cta'">
                        <div class="flex flex-col gap-4">
                            @foreach ($ctaFields as [$key, $label, $multi, $link])
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t[$label] }}</x-nq::field.label>
                                    @if ($multi)
                                        <x-nq::field.textarea x-model="selected.data.{{ $key }}" dir="auto" rows="3" />
                                    @elseif ($link)
                                        <x-nq::field.input ltr x-model="selected.data.{{ $key }}" />
                                        <template x-if="linkInvalid(selected.data.{{ $key }})"><p role="alert" class="{{ $err }}">{{ $t['linkInvalid'] }}</p></template>
                                    @else
                                        <x-nq::field.input x-model="selected.data.{{ $key }}" dir="auto" />
                                    @endif
                                </x-nq::field>
                            @endforeach
                        </div>
                    </template>

                    <template x-if="selected.type === 'text'">
                        <x-nq::field>
                            <x-nq::field.label>{{ $t['body'] }}</x-nq::field.label>
                            <x-nq::field.textarea x-model="selected.data.html" dir="ltr" rows="8" class="font-mono text-code" />
                        </x-nq::field>
                    </template>

                    <template x-if="selected.type === 'features' || selected.type === 'faq'">
                        <div class="flex flex-col gap-4">
                            <x-nq::field>
                                <x-nq::field.label>{{ $t['title'] }}</x-nq::field.label>
                                <x-nq::field.input x-model="selected.data.title" dir="auto" />
                            </x-nq::field>
                            <template x-if="selected.type === 'features'">
                                <x-nq::field>
                                    <x-nq::field.label>{{ $t['subtitle'] }}</x-nq::field.label>
                                    <x-nq::field.input x-model="selected.data.subtitle" dir="auto" />
                                </x-nq::field>
                            </template>
                            <div data-slot="repeater" role="group" aria-label="{{ $t['items'] }}" class="flex flex-col gap-2">
                                <span class="text-label text-foreground">{{ $t['items'] }}</span>
                                <ul class="flex flex-col gap-2">
                                    <template x-for="(item, n) in selected.data.items" x-bind:key="item.id">
                                        <li data-slot="repeater-row" class="flex flex-col gap-3 rounded-card border border-border bg-card p-3">
                                            <div class="flex items-center gap-1">
                                                <span class="min-w-0 flex-1 truncate text-label text-foreground" x-text="itemTitle(selected, item, n)"></span>
                                                <x-nq::button type="button" variant="ghost" size="icon-sm" x-bind:aria-label="labels.moveUp + ': ' + itemTitle(selected, item, n)" x-bind:disabled="n === 0 ? '' : null" x-on:click="moveItem(n, -1)"><x-nq::icon name="arrow-up" aria-hidden="true" /></x-nq::button>
                                                <x-nq::button type="button" variant="ghost" size="icon-sm" x-bind:aria-label="labels.moveDown + ': ' + itemTitle(selected, item, n)" x-bind:disabled="n === selected.data.items.length - 1 ? '' : null" x-on:click="moveItem(n, 1)"><x-nq::icon name="arrow-down" aria-hidden="true" /></x-nq::button>
                                                <x-nq::button type="button" variant="ghost" size="icon-sm" x-bind:aria-label="labels.remove + ': ' + itemTitle(selected, item, n)" x-bind:disabled="selected.data.items.length <= itemMin ? '' : null" x-on:click="removeItem(n)"><x-nq::icon name="trash-2" aria-hidden="true" /></x-nq::button>
                                            </div>
                                            <template x-if="selected.type === 'features'">
                                                <div class="flex flex-col gap-3">
                                                    <x-nq::field>
                                                        <x-nq::field.label>{{ $t['itemTitle'] }}</x-nq::field.label>
                                                        <x-nq::field.input x-model="item.title" dir="auto" />
                                                    </x-nq::field>
                                                    <x-nq::field>
                                                        <x-nq::field.label>{{ $t['itemDescription'] }}</x-nq::field.label>
                                                        <x-nq::field.textarea x-model="item.description" dir="auto" rows="3" />
                                                    </x-nq::field>
                                                </div>
                                            </template>
                                            <template x-if="selected.type === 'faq'">
                                                <div class="flex flex-col gap-3">
                                                    <x-nq::field>
                                                        <x-nq::field.label>{{ $t['question'] }}</x-nq::field.label>
                                                        <x-nq::field.input x-model="item.question" dir="auto" />
                                                    </x-nq::field>
                                                    <x-nq::field>
                                                        <x-nq::field.label>{{ $t['answer'] }}</x-nq::field.label>
                                                        <x-nq::field.textarea x-model="item.answer" dir="auto" rows="3" />
                                                    </x-nq::field>
                                                </div>
                                            </template>
                                        </li>
                                    </template>
                                </ul>
                                <div>
                                    <x-nq::button type="button" x-bind:disabled="selected.data.items.length >= itemMax ? '' : null" x-on:click="addItem()">
                                        <x-nq::icon name="plus" aria-hidden="true" />
                                        <span x-text="selected.type === 'faq' ? labels.addQuestion : labels.addFeature"></span>
                                    </x-nq::button>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </template>
            <template x-if="panel !== 'page' && ! selected"><p class="text-body-sm text-muted-foreground">{{ $t['selectHint'] }}</p></template>
        </section>
    </div>
</div>

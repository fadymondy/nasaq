{{-- <x-nq::presentation-editor :deck="['title' => 'Q3', 'slides' => [['id' => 's1', 'layout' => 'title', 'title' => 'Q3 review']]]" save="async (deck) => { await fetch('/deck', { method: 'POST', body: JSON.stringify(deck) }) }" />
     A slide deck editor: a rail of thumbnails you can drag to reorder (native pointer events), an in-place editing canvas, a layout and theme
     inspector, presenter notes, and Present, which plays the deck in a full-screen player (<x-nq::presentation-editor.deck-player>, included here).
     deck: { title, slides: [{ id, layout, title, subtitle?, body?, body2?, image?, imageAlt?, notes?, theme? }] } (x-modelable: x-model="$wire.deck").
     layout: title | section | content | two-column | quote | image | blank. theme: light | dark | brand.
     save: JS expression of an async function (deck) returning nothing or { error } (adds the Save button and the unsaved-changes badge).
     read-only: look and play, change nothing. fullscreen: ask the browser for full screen when playing (default true). default-show-notes: start the player with notes.
     Events (bubbling): "change" { deck } after every edit, "present" { deck, index } when Present is pressed. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['deck' => ['title' => '', 'slides' => []], 'save' => null, 'readOnly' => false, 'fullscreen' => true, 'defaultShowNotes' => false])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $options = array_filter([
        'readOnly' => $readOnly ?: null,
        'fullscreen' => $fullscreen ? null : false,
        'defaultShowNotes' => $defaultShowNotes ?: null,
    ], fn ($v) => $v !== null);
    $optionsJs = \Illuminate\Support\Js::from((object) $options)->toHtml();
    if ($save) {
        $optionsJs = 'Object.assign('.$optionsJs.', { save: ('.$save.') })';
    }
    $layouts = [
        'title' => ['Title', 'عنوان', 'heading-1'], 'section' => ['Section', 'قسم', 'bookmark'], 'content' => ['Content', 'محتوى', 'list'],
        'two-column' => ['Two columns', 'عمودان', 'columns-2'], 'quote' => ['Quote', 'اقتباس', 'quote'], 'image' => ['Image', 'صورة', 'image'], 'blank' => ['Blank', 'فارغة', 'square'],
    ];
    $themes = ['light' => ['Light', 'فاتح'], 'dark' => ['Dark', 'داكن'], 'brand' => ['Brand', 'العلامة']];
    $deckValue = (array) $deck;
    $deckValue['slides'] = array_values((array) ($deckValue['slides'] ?? []));
@endphp
<div data-slot="presentation-editor" role="group" aria-label="{{ $T('Presentation editor', 'محرر العروض التقديمية') }}"
    x-data="nqPresentation(@js($deckValue), {!! $optionsJs !!})" x-modelable="deck" x-id="['nq-presentation']"
    {{ $attributes->cn('flex min-w-0 flex-col gap-3') }}>
    <div class="flex flex-wrap items-center gap-2">
        <x-nq::field.input x-model="deck.title" aria-label="{{ $T('Deck title', 'عنوان العرض') }}" placeholder="{{ $T('Untitled presentation', 'عرض بلا عنوان') }}" dir="auto" ::readonly="readOnly" class="min-w-40 flex-1 text-label sm:max-w-sm" />
        <span class="text-caption text-muted-foreground" x-text="countText()"></span>
        <div class="ms-auto flex flex-wrap items-center gap-2">
            @if ($save)
                <span x-show="saveState.status === 'saving'" x-cloak style="display: none"><x-nq::badge variant="info">{{ $T('Saving…', 'جارٍ الحفظ…') }}</x-nq::badge></span>
                <span x-show="saveState.status === 'error'" x-cloak style="display: none" role="alert"><x-nq::badge variant="danger"><span x-text="saveState.message"></span></x-nq::badge></span>
                <span x-show="saveState.status === 'idle' && dirty" x-cloak style="display: none"><x-nq::badge variant="warning">{{ $T('Unsaved changes', 'تغييرات غير محفوظة') }}</x-nq::badge></span>
                <span x-show="saveState.status === 'idle' && !dirty"><x-nq::badge variant="success">{{ $T('Saved', 'تم الحفظ') }}</x-nq::badge></span>
            @endif
            @unless ($readOnly)
                <x-nq::dropdown-menu>
                    <x-nq::dropdown-menu.trigger size="sm"><x-lucide-plus aria-hidden="true" />{{ $T('Add slide', 'إضافة شريحة') }}</x-nq::dropdown-menu.trigger>
                    <x-nq::dropdown-menu.content align="end" class="min-w-44">
                        @foreach ($layouts as $layout => [$en, $ar, $icon])
                            <x-nq::dropdown-menu.item x-on:click="addSlide('{{ $layout }}')"><x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />{{ $T($en, $ar) }}</x-nq::dropdown-menu.item>
                        @endforeach
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
                <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $T('Duplicate slide', 'تكرار الشريحة') }}" title="{{ $T('Duplicate slide', 'تكرار الشريحة') }}" ::disabled="!slide" x-on:click="duplicate()"><x-lucide-copy aria-hidden="true" /></x-nq::button>
                <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $T('Move earlier', 'نقل للأمام') }}" title="{{ $T('Move earlier', 'نقل للأمام') }}" ::disabled="!slide || index === 0" x-on:click="move(index, index - 1)"><x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
                <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $T('Move later', 'نقل للخلف') }}" title="{{ $T('Move later', 'نقل للخلف') }}" ::disabled="!slide || index === count - 1" x-on:click="move(index, index + 1)"><x-lucide-arrow-right aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
                <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $T('Delete slide', 'حذف الشريحة') }}" title="{{ $T('Delete slide', 'حذف الشريحة') }}" ::disabled="!slide" x-on:click="remove()"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                @if ($save)
                    <x-nq::button size="sm" ::disabled="!dirty || saveState.status === 'saving'" ::aria-busy="saveState.status === 'saving'" x-on:click="save()">{{ $T('Save', 'حفظ') }}</x-nq::button>
                @endif
            @endunless
            <x-nq::button size="sm" variant="primary" ::disabled="count === 0" x-on:click="present()"><x-lucide-play aria-hidden="true" />{{ $T('Present', 'عرض') }}</x-nq::button>
        </div>
    </div>

    <div x-show="!slide" x-cloak style="display: none">
        <x-nq::states icon="presentation" title="{{ $T('No slides yet', 'لا توجد شرائح بعد') }}" description="{{ $T('Add a slide to start building your presentation.', 'أضف شريحة لتبدأ ببناء عرضك التقديمي.') }}">
            @unless ($readOnly)
                <x-slot:actions><x-nq::button variant="primary" x-on:click="addSlide('title')"><x-lucide-plus aria-hidden="true" />{{ $T('Add slide', 'إضافة شريحة') }}</x-nq::button></x-slot:actions>
            @endunless
        </x-nq::states>
    </div>
    <div x-show="slide" x-cloak style="display: none" class="grid min-w-0 gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
        <nav aria-label="{{ $T('Slides', 'الشرائح') }}" class="min-w-0 overflow-x-auto pb-1 lg:max-h-[38rem] lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
            <ol aria-label="{{ $T('Slides', 'الشرائح') }}" :aria-describedby="$id('nq-presentation', 'hint')" class="flex gap-1 lg:flex-col">
                <template x-for="(s, i) in deck.slides" :key="s.id">
                    <li :data-slide-id="s.id" :data-dragging="isDragging(s.id) ? '' : undefined" :data-over="isOver(i, s.id) ? '' : undefined" :style="thumbStyle(s.id)"
                        class="relative w-36 shrink-0 data-dragging:z-10 data-over:rounded-control data-over:outline-2 data-over:outline-nq-focus lg:w-full"
                        x-on:pointerdown="onThumbDown($event, i, s.id)">
                        <button type="button" :aria-current="slide && s.id === slide.id ? 'true' : undefined" :aria-label="n(i + 1) + '. ' + slideName(s)" :data-index="i"
                            :class="slide && s.id === slide.id ? 'bg-nq-selected' : 'hover:bg-nq-hover'"
                            class="group flex w-full items-start gap-2 rounded-control p-1.5 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                            x-on:click="select(s.id)">
                            <span class="w-4 shrink-0 pt-0.5 text-caption tabular-nums text-muted-foreground" x-text="n(i + 1)"></span>
                            <span :class="slide && s.id === slide.id ? 'border-primary' : 'border-border'" class="block min-w-0 flex-1 overflow-hidden rounded-[6px] border">
                                <x-nq::presentation-editor.slide-view expr="s" decorative class="pointer-events-none" />
                            </span>
                        </button>
                    </li>
                </template>
            </ol>
            <p :id="$id('nq-presentation', 'hint')" class="sr-only">{{ $T('Drag a thumbnail to reorder, or use the move buttons.', 'اسحب الصورة المصغّرة لإعادة الترتيب، أو استخدم أزرار النقل.') }}</p>
        </nav>

        <div class="flex min-w-0 flex-col gap-3">
            <div class="rounded-card border border-border bg-secondary/40 p-2 sm:p-4">
                <template x-for="cur in [slide]" :key="cur && cur.id">
                    <x-nq::presentation-editor.slide-view expr="cur" :editable="! $readOnly" class="rounded-control shadow-xs" />
                </template>
            </div>
            <x-nq::field>
                <x-nq::field.label>{{ $T('Presenter notes', 'ملاحظات المقدّم') }}</x-nq::field.label>
                <x-nq::field.textarea rows="3" dir="auto" x-model="slide.notes" placeholder="{{ $T('What to say on this slide', 'ما ستقوله في هذه الشريحة') }}" ::readonly="readOnly" />
            </x-nq::field>
        </div>

        <div class="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card p-3">
            <p class="text-label text-foreground" x-text="$nq.t('Slide ' + n(index + 1), 'الشريحة ' + n(index + 1))"></p>
            <x-nq::field>
                <x-nq::field.label>{{ $T('Layout', 'التخطيط') }}</x-nq::field.label>
                <x-nq::native-select x-model="slide.layout" ::disabled="readOnly">
                    @foreach ($layouts as $layout => [$en, $ar])
                        <option value="{{ $layout }}">{{ $T($en, $ar) }}</option>
                    @endforeach
                </x-nq::native-select>
            </x-nq::field>
            <div class="flex flex-col gap-1.5">
                <span :id="$id('nq-presentation', 'theme')" class="text-label text-foreground">{{ $T('Theme', 'السمة') }}</span>
                <div role="group" :aria-labelledby="$id('nq-presentation', 'theme')" class="flex flex-wrap gap-1">
                    @foreach ($themes as $theme => [$en, $ar])
                        <x-nq::button size="sm" ::variant="'{{ $theme }}' === (slide.theme ?? 'light') ? 'primary' : 'secondary'" ::aria-pressed="'{{ $theme }}' === (slide.theme ?? 'light')" ::disabled="readOnly" x-on:click="slide.theme = '{{ $theme }}'">{{ $T($en, $ar) }}</x-nq::button>
                    @endforeach
                </div>
            </div>
            <div x-show="slide && slide.layout === 'image'" x-cloak style="display: none" class="flex flex-col gap-4">
                <x-nq::field>
                    <x-nq::field.label>{{ $T('Image URL', 'رابط الصورة') }}</x-nq::field.label>
                    <x-nq::field.input ltr x-model="slide.image" placeholder="https://" ::readonly="readOnly" />
                    <p class="mt-1 text-caption text-muted-foreground">{{ $T('Use an https address or a site-relative path.', 'استخدم عنوان https أو مسارًا نسبيًا للموقع.') }}</p>
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $T('Image description', 'وصف الصورة') }}</x-nq::field.label>
                    <x-nq::field.input dir="auto" x-model="slide.imageAlt" ::readonly="readOnly" />
                </x-nq::field>
            </div>
        </div>
    </div>

    <div class="sr-only" role="status" aria-live="polite" x-text="announce"></div>
    <x-nq::presentation-editor.deck-player />
</div>

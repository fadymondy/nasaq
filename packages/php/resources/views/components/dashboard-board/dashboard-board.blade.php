{{-- <x-nq::dashboard-board title="Overview" :widgets="[['type' => 'revenue', 'title' => 'Revenue', 'defaultCols' => 2]]" :layout="[['id' => 'revenue', 'type' => 'revenue', 'cols' => 2, 'rows' => 1]]" :default-layout="[...]">
       <x-nq::dashboard-board.widget type="revenue"> … </x-nq::dashboard-board.widget>
     </x-nq::dashboard-board>
     A customisable grid of widget cards. Customise turns on editing: drag a card by its handle (pointer, or Space and the arrow keys), resize it from the corner grip
     or the actions menu, pin, add, remove, open settings. Save fires the bubbling "save" event ({ layout, until(promise) }; reject the promise to keep the editor open).
     widgets: [{ type, title, description?, defaultCols?, defaultRows?, minCols?, maxCols?, minRows?, maxRows?, unique?, fields?: [{ key, label, type: select|number|toggle|text, options?, min?, max?, step?, placeholder? }], defaultSettings? }].
     layout: [{ id, type, cols, rows, pinned?, settings? }], x-modelable. default-layout: what Reset goes back to (no Reset without it). row-height: pixels, default 200.
     editing: start in edit mode. loading, error (true or a message). labels: override the localised texts. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['widgets' => [], 'layout' => [], 'defaultLayout' => null, 'rowHeight' => 200, 'title' => null, 'editing' => false, 'loading' => false, 'error' => false, 'locale' => null, 'labels' => []])
@php
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $locale ??= app()->getLocale();
    $init = array_filter([
        'defaultLayout' => $defaultLayout === null ? null : array_values((array) $defaultLayout),
        'rowHeight' => (int) $rowHeight,
        'editing' => $editing ? true : null,
        'loading' => $loading ? true : null,
        'error' => $error ?: null,
        'locale' => $locale,
        'labels' => $labels ?: null,
    ], fn ($v) => $v !== null);
    $js = fn ($v) => \Illuminate\Support\Js::from($v)->toHtml();
    $region = $T('Dashboard', 'لوحة المعلومات');
    $cardClass = 'flex flex-col rounded-card border border-border bg-card text-card-foreground';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'dashboard-board') }}" aria-label="{{ $region }}"
    x-data="nqDashboardBoard({!! $js(array_values((array) $widgets)) !!}, {!! $js(array_values((array) $layout)) !!}, {!! $js((object) $init) !!})" x-modelable="layout"
    {{ $attributes->except('data-slot')->cn('flex w-full min-w-0 flex-col gap-4') }}>
    <div hidden data-slot="dashboard-board-widgets">{{ $slot }}</div>

    <div class="flex flex-wrap items-center gap-3">
        @if ($title)
            <h2 class="me-auto text-h3 font-semibold">{{ $title }}</h2>
        @else
            <span class="me-auto"></span>
        @endif
        <template x-if="editing">
            <div class="contents">
                <x-nq::badge variant="brand"><span x-text="s.editing"></span></x-nq::badge>
                <x-nq::button variant="secondary" x-bind:disabled="saving" x-on:click="showAdd()"><x-lucide-plus aria-hidden="true" /> {{ $T('Add widget', 'إضافة عنصر') }}</x-nq::button>
                <template x-if="hasDefault()">
                    <x-nq::button variant="ghost" x-bind:disabled="saving" x-on:click="resetToDefault()"><x-lucide-rotate-ccw aria-hidden="true" /> {{ $T('Reset to default', 'استعادة الافتراضي') }}</x-nq::button>
                </template>
                <x-nq::button variant="ghost" x-bind:disabled="saving" x-on:click="stopEditing()">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                <x-nq::button x-bind:disabled="!canSave()" x-bind:aria-busy="saving ? 'true' : null" x-on:click="save()">
                    <x-lucide-loader-circle x-show="saving" x-cloak style="display: none" aria-hidden="true" class="size-4 animate-spin motion-reduce:animate-none" />
                    <x-lucide-check x-show="!saving" aria-hidden="true" />
                    <span x-show="!saving">{{ $T('Save', 'حفظ') }}</span><span x-show="saving" x-cloak style="display: none">{{ $T('Saving', 'جارٍ الحفظ') }}</span>
                </x-nq::button>
            </div>
        </template>
        <template x-if="!editing">
            <x-nq::button variant="secondary" x-bind:disabled="!canEdit()" x-on:click="startEditing()"><x-lucide-pencil aria-hidden="true" /> {{ $T('Customise', 'تخصيص') }}</x-nq::button>
        </template>
    </div>
    <p x-show="editing" x-cloak style="display: none" class="text-body-sm text-muted-foreground">{{ $T('Drag cards to reorder, resize them, pin the ones you always want first.', 'اسحب البطاقات لإعادة ترتيبها، وغيّر أحجامها، وثبّت ما تريده في المقدمة دائمًا.') }}</p>
    <p x-show="saveError" x-cloak style="display: none" role="alert" class="text-body-sm text-danger">{{ $T('Could not save the dashboard. Your changes are still here, try again.', 'تعذّر حفظ اللوحة. تغييراتك ما زالت هنا، حاول مرة أخرى.') }}</p>

    <x-nq::states.error x-show="error" x-cloak style="display: none" :title="is_string($error) ? $error : $T('Could not load the dashboard', 'تعذّر تحميل اللوحة')" />
    <x-nq::states.loading x-show="loading" x-cloak style="display: none" :rows="4" />
    <x-nq::states x-show="isEmpty()" x-cloak style="display: none" icon="layout-dashboard" :title="$T('This dashboard is empty', 'اللوحة فارغة')" :description="$T('Add widgets to see your numbers here.', 'أضف عناصر لعرض أرقامك هنا.')" />

    <ul x-ref="grid" x-show="showGrid()" x-cloak style="display: none" x-bind:style="gridStyle()" aria-label="{{ $region }}" class="grid w-full list-none p-0">
        <template x-for="card in list" :key="card.id">
            <li x-bind:data-board-id="card.id" x-bind:data-dragging="activeId === card.id ? '' : null" x-bind:style="cardStyle(card)" x-bind:class="cardClass(card)" class="min-w-0">
                <x-nq::context-menu class="h-full w-full">
                    <div data-slot="dashboard-board-card" x-bind="trigger" x-ref="trigger" class="relative h-full w-full">
                        <div x-bind:class="surfaceClass(card)" class="{{ $cardClass }} h-full w-full gap-0 overflow-hidden py-0">
                            <div class="flex min-h-11 items-center gap-2 border-b border-border px-3 py-1.5">
                                <template x-if="editing">
                                    <button type="button" x-bind:data-board-handle="card.id" aria-roledescription="{{ $T('draggable card', 'بطاقة قابلة للسحب') }}" x-bind:aria-label="handleLabel(card)"
                                        x-bind:aria-pressed="activeId === card.id ? 'true' : 'false'" title="{{ $T('To reorder, focus the drag handle and press Space, then use the arrow keys. Or open the actions menu and choose Move earlier or Move later.', 'لإعادة الترتيب، ركّز على مقبض السحب واضغط المسافة ثم استخدم الأسهم. أو افتح قائمة الإجراءات واختر تقديم أو تأخير.') }}"
                                        x-on:pointerdown="handleDown($event, card.id)" x-on:keydown="handleKey($event, card.id)"
                                        class="-ms-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"><x-lucide-grip-vertical aria-hidden="true" class="size-4" /></button>
                                </template>
                                <h3 class="min-w-0 flex-1 truncate text-body-sm font-medium" x-text="widgetTitle(card)"></h3>
                                <span x-show="card.pinned" x-cloak style="display: none" role="img" aria-label="{{ $T('Pinned', 'مثبّتة') }}" class="inline-flex"><x-lucide-pin class="size-3.5 shrink-0 text-muted-foreground" /></span>
                                <template x-if="editing">
                                    <span dir="ltr" role="img" x-bind:aria-label="sizeAria(card)" class="shrink-0 text-caption tabular-nums text-muted-foreground" x-text="sizeText(card)"></span>
                                </template>
                                <template x-if="editing">
                                    <x-nq::button variant="ghost" size="icon-sm" x-bind:aria-pressed="card.pinned ? 'true' : 'false'" x-bind:aria-label="pinLabel(card)" x-on:click="togglePinned(card)">
                                        <x-lucide-pin-off x-show="card.pinned" x-cloak style="display: none" aria-hidden="true" />
                                        <x-lucide-pin x-show="!card.pinned" aria-hidden="true" />
                                    </x-nq::button>
                                </template>
                                <template x-if="hasMenu(card)">
                                    <x-nq::button variant="ghost" size="icon-sm" data-board-more x-bind:aria-label="moreLabel(card)"
                                        x-on:click="onlySettings(card) ? openSettings(card) : openAt($el.getBoundingClientRect().left, $el.getBoundingClientRect().bottom, true)">
                                        <x-lucide-settings-2 x-show="onlySettings(card)" x-cloak style="display: none" aria-hidden="true" />
                                        <x-lucide-ellipsis x-show="!onlySettings(card)" aria-hidden="true" />
                                    </x-nq::button>
                                </template>
                            </div>
                            <div x-bind:inert="editing ? '' : null" x-init="mountWidget($el, card)" class="min-h-0 flex-1 overflow-auto p-3">
                                <p x-show="!known(card)" x-cloak style="display: none" class="text-body-sm text-muted-foreground">{{ $T('This widget is not available any more.', 'هذا العنصر لم يعد متاحًا.') }}</p>
                            </div>
                        </div>
                        <template x-if="editing">
                            <button type="button" tabindex="-1" aria-hidden="true" data-board-grip x-on:pointerdown="gripDown($event, card)"
                                class="absolute bottom-1 end-1 z-10 flex size-6 cursor-nwse-resize touch-none items-center justify-center rounded-control text-muted-foreground hover:bg-muted rtl:cursor-nesw-resize"><x-lucide-move-diagonal aria-hidden="true" class="size-4 rtl:-scale-x-100" /></button>
                        </template>
                    </div>
                    <x-nq::context-menu.content>
                        <template x-if="editing">
                            <div class="contents">
                                <x-nq::context-menu.group>
                                    <x-nq::context-menu.item x-bind:data-disabled="off(card, 'wider') ? '' : null" x-bind:aria-disabled="off(card, 'wider') ? 'true' : null" x-on:click="resizeBy(card, 1, 0)"><x-lucide-expand /> {{ $T('Wider', 'أعرض') }}</x-nq::context-menu.item>
                                    <x-nq::context-menu.item x-bind:data-disabled="off(card, 'narrower') ? '' : null" x-bind:aria-disabled="off(card, 'narrower') ? 'true' : null" x-on:click="resizeBy(card, -1, 0)"><x-lucide-shrink /> {{ $T('Narrower', 'أضيق') }}</x-nq::context-menu.item>
                                    <x-nq::context-menu.item x-bind:data-disabled="off(card, 'taller') ? '' : null" x-bind:aria-disabled="off(card, 'taller') ? 'true' : null" x-on:click="resizeBy(card, 0, 1)"><x-lucide-expand /> {{ $T('Taller', 'أطول') }}</x-nq::context-menu.item>
                                    <x-nq::context-menu.item x-bind:data-disabled="off(card, 'shorter') ? '' : null" x-bind:aria-disabled="off(card, 'shorter') ? 'true' : null" x-on:click="resizeBy(card, 0, -1)"><x-lucide-shrink /> {{ $T('Shorter', 'أقصر') }}</x-nq::context-menu.item>
                                </x-nq::context-menu.group>
                                <x-nq::context-menu.separator />
                                <x-nq::context-menu.group>
                                    <x-nq::context-menu.item x-bind:data-disabled="off(card, 'earlier') ? '' : null" x-bind:aria-disabled="off(card, 'earlier') ? 'true' : null" x-on:click="move(card, -1)"><x-lucide-arrow-up /> {{ $T('Move earlier', 'تقديم') }}</x-nq::context-menu.item>
                                    <x-nq::context-menu.item x-bind:data-disabled="off(card, 'later') ? '' : null" x-bind:aria-disabled="off(card, 'later') ? 'true' : null" x-on:click="move(card, 1)"><x-lucide-arrow-down /> {{ $T('Move later', 'تأخير') }}</x-nq::context-menu.item>
                                    <x-nq::context-menu.item x-on:click="togglePinned(card)"><x-lucide-pin /> <span x-text="pinLabel(card)"></span></x-nq::context-menu.item>
                                </x-nq::context-menu.group>
                                <x-nq::context-menu.separator />
                            </div>
                        </template>
                        <template x-if="hasFields(card)">
                            <div class="contents">
                                <x-nq::context-menu.item x-on:click="openSettings(card)"><x-lucide-settings-2 /> {{ $T('Settings', 'الإعدادات') }}</x-nq::context-menu.item>
                            </div>
                        </template>
                        <template x-if="editing">
                            <div class="contents">
                                <x-nq::context-menu.separator x-show="hasFields(card)" />
                                <x-nq::context-menu.item variant="danger" x-on:click="removeItem(card)"><x-lucide-trash-2 /> {{ $T('Remove', 'إزالة') }}</x-nq::context-menu.item>
                            </div>
                        </template>
                    </x-nq::context-menu.content>
                </x-nq::context-menu>
            </li>
        </template>
    </ul>
    <p role="status" aria-live="polite" class="sr-only" x-text="live"></p>

    <x-nq::dialog x-model="adding">
        <x-nq::dialog.content>
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $T('Add a widget', 'إضافة عنصر') }}</x-nq::dialog.title>
                <x-nq::dialog.description>{{ $T('Pick a widget to add to the end of the dashboard.', 'اختر عنصرًا لإضافته في نهاية اللوحة.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
                <template x-for="w in widgets" :key="w.type">
                    <li class="flex items-center gap-3 px-3 py-2.5">
                        <div class="min-w-0 flex-1">
                            <p class="text-body font-medium" x-text="w.title"></p>
                            <p x-show="w.description" class="text-caption text-muted-foreground" x-text="w.description"></p>
                            <p x-show="taken(w)" x-cloak style="display: none" class="text-caption text-muted-foreground">{{ $T('Already on the dashboard', 'موجود في اللوحة') }}</p>
                        </div>
                        <x-nq::button size="sm" variant="secondary" x-bind:disabled="taken(w)" x-bind:aria-label="'{{ $T('Add widget', 'إضافة عنصر') }}: ' + w.title" x-on:click="addWidget(w)"><x-lucide-plus aria-hidden="true" /> {{ $T('Add widget', 'إضافة عنصر') }}</x-nq::button>
                    </li>
                </template>
            </ul>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <x-nq::dialog x-model="settingsOpen">
        <x-nq::dialog.content>
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="settingsHeading"></span></x-nq::dialog.title>
                <x-nq::dialog.description>{{ $T('These are saved with your dashboard.', 'تُحفظ هذه مع لوحتك.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <form class="grid gap-4" x-on:submit.prevent="saveSettings()">
                <template x-for="f in settingsFields" :key="f.key">
                    <div class="contents">
                        <template x-if="f.type === 'toggle'">
                            <div class="flex items-center justify-between gap-3">
                                <span x-bind:id="'nq-bs-' + f.key" class="text-body" x-text="f.label"></span>
                                <x-nq::switch x-model="form[f.key]" x-bind:aria-labelledby="'nq-bs-' + f.key" />
                            </div>
                        </template>
                        <template x-if="f.type === 'select'">
                            <div class="grid gap-1.5">
                                <span x-bind:id="'nq-bs-' + f.key" class="text-label font-medium" x-text="f.label"></span>
                                <x-nq::select x-model="form[f.key]">
                                    <x-nq::select.trigger x-bind:aria-labelledby="'nq-bs-' + f.key"><x-nq::select.value /></x-nq::select.trigger>
                                    <x-nq::select.content>
                                        <template x-for="o in f.options" :key="o.value">
                                            <div data-slot="select-item" x-bind="item(o.value, false)" x-effect="reg(o.value, o.label)"
                                                class="relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50">
                                                <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center"><span x-show="isSelected(o.value)" x-cloak class="contents"><x-lucide-check class="size-4" /></span></span>
                                                <span data-slot="select-item-text" class="min-w-0 flex-1 truncate" x-text="o.label"></span>
                                            </div>
                                        </template>
                                    </x-nq::select.content>
                                </x-nq::select>
                            </div>
                        </template>
                        <template x-if="f.type === 'number'">
                            <x-nq::field>
                                <x-nq::field.label><span x-text="f.label"></span></x-nq::field.label>
                                <x-nq::field.input type="number" inputmode="numeric" ltr x-bind:min="f.min" x-bind:max="f.max" x-bind:step="f.step" x-model.number="form[f.key]" />
                            </x-nq::field>
                        </template>
                        <template x-if="f.type === 'text'">
                            <x-nq::field>
                                <x-nq::field.label><span x-text="f.label"></span></x-nq::field.label>
                                <x-nq::field.input x-bind:placeholder="f.placeholder" x-model="form[f.key]" />
                            </x-nq::field>
                        </template>
                    </div>
                </template>
                <x-nq::dialog.footer>
                    <x-nq::button type="button" variant="ghost" x-on:click="settingsOpen = false">{{ $T('Cancel', 'إلغاء') }}</x-nq::button>
                    <x-nq::button type="submit" variant="primary">{{ $T('Save settings', 'حفظ الإعدادات') }}</x-nq::button>
                </x-nq::dialog.footer>
            </form>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>

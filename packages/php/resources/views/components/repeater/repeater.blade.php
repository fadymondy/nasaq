{{-- <x-nq::repeater :items="[['name' => 'Sara']]" create-item="{ name: '' }" row-title="item.name" :min="1" :max="5"> <x-nq::field.input x-model="item.name" /> </x-nq::repeater>
     A list of repeatable form rows: add, remove, duplicate, drag the handle (native pointer events) or focus it and use the arrow keys / Home / End, collapse, with min and max limits.
     The slot is one row's body. Inside it use `item` (the row, x-model="item.name"), `index` and keyOf(index) (a stable id for input ids).
     items: the initial rows (x-modelable: x-model="$wire.phones"). create-item: JS expression for a new row. clone-item: JS expression of `item` for Duplicate (default: JSON copy).
     row-title / row-label / row-summary: JS expressions of `item` and `index` (title, plain name for labels, the line shown while collapsed). Default title "Item 1", "Item 2"…
     min, max, reorderable, duplicable, collapsible (default true), default-collapsed, disabled, label (names the list), add-label, empty (named slot: shown with no rows).
     A "change" event ({ items }) bubbles after every add, remove, duplicate and move. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'createItem' => null, 'cloneItem' => null, 'rowTitle' => null, 'rowLabel' => null, 'rowSummary' => null, 'min' => 0, 'max' => null, 'reorderable' => true, 'duplicable' => true, 'collapsible' => true, 'defaultCollapsed' => false, 'disabled' => false, 'label' => null, 'addLabel' => null])
@php
    $options = array_filter([
        'min' => $min ?: null,
        'max' => $max,
        'reorderable' => $reorderable ? null : false,
        'duplicable' => $duplicable ? null : false,
        'collapsible' => $collapsible ? null : false,
        'defaultCollapsed' => $defaultCollapsed ?: null,
        'disabled' => $disabled ?: null,
    ], fn ($v) => $v !== null);
    $optionsJs = \Illuminate\Support\Js::from((object) $options)->toHtml();
    $fns = [];
    if ($createItem) { $fns[] = 'createItem: () => ('.$createItem.')'; }
    if ($cloneItem) { $fns[] = 'cloneItem: (item) => ('.$cloneItem.')'; }
    if ($rowTitle) { $fns[] = 'rowTitle: (item, index) => ('.$rowTitle.')'; }
    if ($rowLabel) { $fns[] = 'rowLabel: (item, index) => ('.$rowLabel.')'; }
    if ($rowSummary) { $fns[] = 'rowSummary: (item, index) => ('.$rowSummary.')'; }
    if ($fns) {
        $optionsJs = 'Object.assign('.$optionsJs.', { '.implode(', ', $fns).' })';
    }
    $listLabel = $label ?? \Nasaq\Nasaq::t('Items', 'العناصر');
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
@endphp
<div data-slot="repeater" x-data="nqRepeater(@js(array_values((array) $items)), {!! $optionsJs !!})" x-modelable="items" x-id="['nq-repeater-body']" @if ($disabled) data-disabled="true" @endif
    {{ $attributes->cn('flex min-w-0 flex-col gap-3') }}>
    @if ($collapsible)
        <div x-show="count() > 1" x-cloak style="display: none" class="flex items-center justify-between gap-2">
            <span data-slot="repeater-count" class="text-caption tabular-nums text-muted-foreground" x-text="countText()"></span>
            <x-nq::button type="button" variant="ghost" size="sm" x-on:click="toggleAll()">
                <span x-show="!allCollapsed()" aria-hidden="true" class="flex [&_svg]:size-4"><x-lucide-chevrons-down-up /></span>
                <span x-show="allCollapsed()" x-cloak style="display: none" aria-hidden="true" class="flex [&_svg]:size-4"><x-lucide-chevrons-up-down /></span>
                <span x-text="allCollapsed() ? $nq.t('Expand all', 'توسيع الكل') : $nq.t('Collapse all', 'طيّ الكل')"></span>
            </x-nq::button>
        </div>
    @endif
    @if ($reorderable)
        <p :id="hintId()" class="sr-only">{{ $T('Focus the handle, then use the arrow keys to move the row. Home and End jump to the ends.', 'ركّز على المقبض ثم استخدم مفاتيح الأسهم لنقل الصف. Home وEnd للانتقال إلى الطرفين.') }}</p>
    @endif

    <div x-show="count() === 0" x-cloak style="display: none" data-slot="repeater-empty"
        class="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">
        @isset($empty){{ $empty }}@else{{ $T('No items yet.', 'لا توجد عناصر بعد.') }}@endisset
    </div>
    <ol x-show="count() > 0" x-cloak style="display: none" aria-label="{{ $listLabel }}" class="flex flex-col gap-2">
        <template x-for="(item, index) in items" :key="keyOf(index)">
            <li data-slot="repeater-row" :data-row-key="keyOf(index)" :data-collapsed="isCollapsed(index) ? 'true' : undefined" :data-dragging="isDragging(index) ? 'true' : undefined" :style="rowStyle(index)"
                class="relative rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating">
                <div data-slot="repeater-row-header" class="flex min-h-control items-center gap-1 p-1.5">
                    @if ($reorderable)
                        <button type="button" x-show="count() > 1" data-repeater-focus :aria-label="$nq.t('Reorder ' + name(index), 'إعادة ترتيب ' + name(index))" :title="$nq.t('Reorder ' + name(index), 'إعادة ترتيب ' + name(index))"
                            :aria-describedby="hintId()" aria-keyshortcuts="ArrowUp ArrowDown Home End" :disabled="disabled"
                            x-on:keydown="onHandleKey($event, index)" x-on:pointerdown="startDrag($event, index)"
                            class="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4">
                            <x-lucide-grip-vertical aria-hidden="true" />
                        </button>
                    @endif
                    @if ($collapsible)
                        <button type="button" {{ $reorderable ? '' : 'data-repeater-focus' }} :aria-expanded="isCollapsed(index) ? 'false' : 'true'" :aria-controls="$id('nq-repeater-body', index)"
                            :aria-label="isCollapsed(index) ? $nq.t('Expand ' + name(index), 'توسيع ' + name(index)) : $nq.t('Collapse ' + name(index), 'طيّ ' + name(index))"
                            x-on:click="toggle(index)"
                            class="flex min-h-control-sm min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <span aria-hidden="true" :class="isCollapsed(index) ? '' : 'rotate-90 rtl:-rotate-90'" class="flex size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-nq rtl:-scale-x-100 [&_svg]:size-4"><x-lucide-chevron-right /></span>
                            <span class="min-w-0 truncate text-label text-foreground" x-text="title(index)"></span>
                            <span x-show="isCollapsed(index) && summary(index)" class="min-w-0 flex-1 truncate text-body-sm text-muted-foreground" x-text="summary(index)"></span>
                        </button>
                    @else
                        <div class="flex min-w-0 flex-1 items-center gap-2 px-1.5">
                            <span {{ $reorderable ? '' : 'data-repeater-focus tabindex=-1' }} class="min-w-0 truncate text-label text-foreground outline-none" x-text="title(index)"></span>
                        </div>
                    @endif
                    <span class="sr-only" x-text="n(index + 1)"></span>
                    @if ($duplicable)
                        <x-nq::button type="button" variant="ghost" size="icon-sm" ::aria-label="$nq.t('Duplicate ' + name(index), 'تكرار ' + name(index))" ::title="$nq.t('Duplicate ' + name(index), 'تكرار ' + name(index))" ::disabled="disabled || atMax()" x-on:click="duplicate(index)">
                            <x-lucide-copy aria-hidden="true" />
                        </x-nq::button>
                    @endif
                    <x-nq::button type="button" variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-nq-danger-text" ::aria-label="$nq.t('Remove ' + name(index), 'حذف ' + name(index))" ::title="$nq.t('Remove ' + name(index), 'حذف ' + name(index))" ::disabled="disabled || atMin()" x-on:click="remove(index)">
                        <x-lucide-trash-2 aria-hidden="true" />
                    </x-nq::button>
                </div>
                <div :id="$id('nq-repeater-body', index)" data-slot="repeater-body" x-show="!isCollapsed(index)" class="border-t border-border p-3 sm:p-4">{{ $slot }}</div>
            </li>
        </template>
    </ol>

    <div class="flex flex-wrap items-center gap-3">
        <x-nq::button type="button" variant="secondary" data-repeater-add ::disabled="disabled || atMax()" ::aria-describedby="limitText() ? limitId() : undefined" x-on:click="add()">
            <x-lucide-plus aria-hidden="true" />
            @if ($addLabel){{ $addLabel }}@else{{ $T('Add item', 'إضافة عنصر') }}@endif
        </x-nq::button>
        <span x-show="limitText()" x-cloak style="display: none" :id="limitId()" class="text-caption text-muted-foreground" x-text="limitText()"></span>
    </div>

    <div aria-live="polite" role="status" class="sr-only" x-text="announcement"></div>
</div>

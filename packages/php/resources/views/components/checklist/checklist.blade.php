{{-- <x-nq::checklist :items="$items" add remove />
     Small pieces of work inside a task: tickable items with a progress bar, one level of subtasks and file attachments.
     A parent follows its subtasks and ticking a parent ticks them all.
     items: array of { id, text, done, subtasks?: [...], attachments?: [{ id, name, size?, url? }], meta? }.
     add: show the add row (and a "+" for subtasks). remove: show delete buttons. attach: show attach buttons. read-only: no ticking, adding or deleting.
     show-progress (default true). optimistic: false stops the list updating itself after an action.
     Bubbling events: "toggle" { id, done }, "add" { text, parentId? }, "remove" { id }, "attach" { id, files }, "remove-attachment" { itemId, attachmentId }.
     items is x-modelable. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'add' => false, 'remove' => false, 'attach' => false, 'readOnly' => false, 'showProgress' => true, 'optimistic' => true])
@php
    $options = array_filter([
        'canAdd' => $add ?: null,
        'canRemove' => $remove ?: null,
        'canAttach' => $attach ?: null,
        'readOnly' => $readOnly ?: null,
        'optimistic' => $optimistic ? null : false,
    ], fn ($v) => $v !== null);
    $T = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $box = 'relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-disabled:cursor-not-allowed data-disabled:opacity-50 after:absolute after:-inset-1';
@endphp
<section data-slot="checklist" aria-label="{{ $T('Checklist', 'قائمة المهام') }}" x-data="nqChecklist(@js(array_values((array) $items)), {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})" x-modelable="items"
    {{ $attributes->cn('flex flex-col gap-3') }}>
    @if ($showProgress)
        <div data-slot="progress" role="progressbar" x-show="progress().total > 0" x-cloak style="display: none" aria-valuemin="0" aria-valuemax="100" x-bind:aria-valuenow="progress().percent" x-bind:data-tone="progress().percent === 100 ? 'success' : 'default'" class="flex w-full flex-col gap-1.5">
            <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
                <span class="text-label text-foreground" x-text="progressLabel()"></span>
                <span aria-hidden="true" class="text-muted-foreground tabular-nums" x-text="progress().percent + '%'"></span>
            </div>
            <div data-slot="progress-track" class="relative block w-full overflow-hidden rounded-full bg-nq-surface-soft h-2">
                <div data-slot="progress-indicator" x-bind:style="'inset-inline-start:0;width:' + progress().percent + '%'" x-bind:class="progress().percent === 100 ? 'bg-nq-success' : 'bg-primary'" class="block h-full rounded-full transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
            </div>
        </div>
    @endif

    <x-nq::states icon="list-checks" x-show="items.length === 0" x-cloak style="display: none" :title="$T('No items yet', 'لا توجد عناصر بعد')" :description="$readOnly ? null : $T('Add the first thing that needs doing.', 'أضف أول شيء يحتاج إلى إنجاز.')" />

    <ul x-show="items.length > 0" aria-label="{{ $T('Items', 'العناصر') }}" class="flex flex-col gap-1">
        <template x-for="item in items" :key="item.id">
            <li data-slot="checklist-item" x-bind:data-done="done(item) ? '' : null" class="flex flex-col gap-1.5">
                <div class="group flex items-start gap-2.5 rounded-control px-1 py-1 hover:bg-nq-hover">
                    <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                        <button type="button" role="checkbox" data-slot="checkbox" x-on:click.prevent="toggle(item)" x-bind:disabled="readOnly" x-bind:aria-label="item.text"
                            x-bind:aria-checked="state(item) === 'some' ? 'mixed' : String(done(item))"
                            x-bind:data-checked="done(item) && state(item) !== 'some' ? '' : null" x-bind:data-unchecked="!done(item) && state(item) !== 'some' ? '' : null" x-bind:data-indeterminate="state(item) === 'some' ? '' : null"
                            class="mt-0.5 {{ $box }}">
                            <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="done(item) || state(item) === 'some'" x-cloak style="display: none">
                                <x-lucide-minus aria-hidden="true" x-show="state(item) === 'some'" style="display: none" />
                                <x-lucide-check aria-hidden="true" x-show="state(item) !== 'some'" />
                            </span>
                        </button>
                        <span class="flex min-w-0 flex-col">
                            <span class="text-body-sm text-foreground" x-bind:class="done(item) && 'text-muted-foreground line-through'" x-text="item.text"></span>
                            <span x-show="item.meta" class="text-caption text-muted-foreground" x-text="item.meta"></span>
                        </span>
                    </label>
                    <span x-show="(item.subtasks ?? []).length > 0" x-cloak style="display: none" dir="ltr" class="mt-0.5 shrink-0 text-caption tabular-nums text-muted-foreground" x-text="doneSubs(item) + '/' + (item.subtasks ?? []).length"></span>
                    <div class="flex shrink-0 items-center">
                        @if ($add)
                            <x-nq::button variant="ghost" size="icon-sm" x-show="!readOnly" x-bind:aria-label="$nq.t('Add a subtask to ', 'إضافة مهمة فرعية إلى ') + item.text" x-on:click="startAdd(item.id)"><x-lucide-plus aria-hidden="true" /></x-nq::button>
                        @endif
                        @if ($attach)
                            <x-nq::button variant="ghost" size="icon-sm" x-show="!readOnly" x-bind:aria-label="$nq.t('Attach a file to ', 'إرفاق ملف إلى ') + item.text" x-on:click="$el.nextElementSibling.click()"><x-lucide-paperclip aria-hidden="true" /></x-nq::button>
                            <input type="file" multiple class="sr-only" tabindex="-1" x-on:change="attach(item.id, $event)">
                        @endif
                        @if ($remove)
                            <x-nq::button variant="ghost" size="icon-sm" x-show="!readOnly" x-bind:aria-label="$nq.t('Delete ', 'حذف ') + item.text" x-on:click="remove(item.id)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                        @endif
                        <x-nq::button variant="ghost" size="icon-sm" x-show="(item.subtasks ?? []).length > 0" x-cloak style="display: none" x-bind:aria-expanded="isOpen(item.id)"
                            x-bind:aria-label="(isOpen(item.id) ? $nq.t('Hide subtasks of ', 'إخفاء المهام الفرعية لـ ') : $nq.t('Show subtasks of ', 'إظهار المهام الفرعية لـ ')) + item.text" x-on:click="toggleOpen(item.id)">
                            <x-lucide-chevron-down aria-hidden="true" class="transition-transform duration-150" x-bind:class="!isOpen(item.id) && '-rotate-90 rtl:rotate-90'" />
                        </x-nq::button>
                    </div>
                </div>

                <ul x-show="(item.attachments ?? []).length > 0" x-cloak style="display: none" class="flex flex-wrap gap-1.5 ps-8" aria-label="{{ $T('Attach a file', 'إرفاق ملف') }}">
                    <template x-for="a in item.attachments ?? []" :key="a.id">
                        <li class="inline-flex max-w-full items-center gap-1 rounded-control border border-border bg-secondary px-2 py-0.5 text-caption text-foreground">
                            <x-lucide-paperclip aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />
                            <a x-show="a.url" x-bind:href="a.url" dir="auto" class="truncate underline-offset-2 hover:underline" x-text="a.name"></a>
                            <span x-show="!a.url" dir="auto" class="truncate" x-text="a.name"></span>
                            <bdi x-show="a.size !== undefined" class="text-muted-foreground" x-text="a.size !== undefined ? size(a.size) : ''"></bdi>
                            <button type="button" x-show="!readOnly" x-bind:aria-label="$nq.t('Remove ', 'إزالة ') + a.name" x-on:click="removeAttachment(item.id, a.id)"
                                class="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"><x-lucide-x aria-hidden="true" class="size-3" /></button>
                        </li>
                    </template>
                </ul>

                <ul x-show="(item.subtasks ?? []).length > 0 && isOpen(item.id)" x-cloak style="display: none" class="ms-3 flex flex-col gap-1 border-s border-border ps-4">
                    <template x-for="sub in item.subtasks ?? []" :key="sub.id">
                        <li data-slot="checklist-item" x-bind:data-done="sub.done ? '' : null" class="flex flex-col gap-1.5">
                            <div class="group flex items-start gap-2.5 rounded-control px-1 py-1 hover:bg-nq-hover">
                                <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                                    <button type="button" role="checkbox" data-slot="checkbox" x-on:click.prevent="toggle(sub)" x-bind:disabled="readOnly" x-bind:aria-label="sub.text" x-bind:aria-checked="String(sub.done)"
                                        x-bind:data-checked="sub.done ? '' : null" x-bind:data-unchecked="sub.done ? null : ''" class="mt-0.5 {{ $box }}">
                                        <span data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3" x-show="sub.done" x-cloak style="display: none"><x-lucide-check aria-hidden="true" /></span>
                                    </button>
                                    <span class="flex min-w-0 flex-col">
                                        <span class="text-body-sm text-foreground" x-bind:class="sub.done && 'text-muted-foreground line-through'" x-text="sub.text"></span>
                                        <span x-show="sub.meta" class="text-caption text-muted-foreground" x-text="sub.meta"></span>
                                    </span>
                                </label>
                                @if ($remove)
                                    <x-nq::button variant="ghost" size="icon-sm" x-show="!readOnly" x-bind:aria-label="$nq.t('Delete ', 'حذف ') + sub.text" x-on:click="remove(sub.id)"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                @endif
                            </div>
                        </li>
                    </template>
                </ul>

                @if ($add)
                    <div x-show="adding === item.id" x-cloak style="display: none" class="ms-3 ps-4">
                        <form class="flex items-center gap-2" x-on:submit.prevent="add(item.id)" x-on:keydown.escape="adding = null">
                            <x-nq::field.input x-model="subText" x-effect="adding === item.id && $nextTick(() => $el.focus())" aria-label="{{ $T('Add subtask', 'إضافة مهمة فرعية') }}" placeholder="{{ $T('Add a subtask', 'أضف مهمة فرعية') }}" />
                            <x-nq::button type="submit" variant="secondary" x-bind:disabled="subText.trim() === ''"><x-lucide-plus aria-hidden="true" />{{ $T('Add', 'إضافة') }}</x-nq::button>
                        </form>
                    </div>
                @endif
            </li>
        </template>
    </ul>

    @if ($add && ! $readOnly)
        <form class="flex items-center gap-2" x-on:submit.prevent="add()">
            <x-nq::field.input x-model="text" aria-label="{{ $T('New item', 'عنصر جديد') }}" placeholder="{{ $T('Add an item', 'أضف عنصرًا') }}" />
            <x-nq::button type="submit" variant="secondary" x-bind:disabled="text.trim() === ''"><x-lucide-plus aria-hidden="true" />{{ $T('Add', 'إضافة') }}</x-nq::button>
        </form>
    @endif
</section>

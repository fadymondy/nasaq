{{-- Internal: one list of the schema form: tags, a checkbox group, repeated inputs, or collapsible groups of fields.
     Variables: $node, $pre, $suf (the path), $lv (how many lists enclose this one), $t, $rels, $disabled. --}}
@php
    $P = nq_sf_p($pre, $suf);
    $mode = $node['mode'];
    $item = $node['item'];
    $rv = 'r'.$lv;
    $isReq = ! empty($node['required']);
    $star = '<span x-show="required('.$P.')" aria-hidden="true" class="ms-0.5 text-nq-danger-text"'.($isReq ? '' : ' style="display: none"').'>*</span>';
    $add = sprintf($t['add'], $node['itemLabel']);
    $empty = sprintf($t['empty'], $node['label']);
    $row = fn (string $key) => $rv.'.'.$key;
    $RP = nq_sf_p($rv.'.path', '');
@endphp
@if ($mode === 'tags')
    <x-nq::field>
        <x-nq::field.label>{{ $node['label'] }}{!! $star !!}</x-nq::field.label>
        <x-nq::tag-input x-model="m[{{ $P }}]" :max-tags="$node['max'] ?? null" :placeholder="$item['field']['placeholder'] ?? null"
            :dir="! empty($item['field']['ltr']) ? 'ltr' : null" validate="tagOk({{ $P }}, tag)" x-bind:aria-invalid="ariaInvalid({{ $P }})" />
        @if (! empty($node['description']))<x-nq::field.description>{{ $node['description'] }}</x-nq::field.description>@endif
        <div data-slot="field-error" role="alert" x-show="msg({{ $P }})" x-text="msg({{ $P }})" style="display: none" class="text-caption text-nq-danger-text"></div>
    </x-nq::field>
@else
    <fieldset data-slot="schema-form-list" @if ($disabled) disabled @endif class="flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend class="mb-1 text-label text-foreground">{{ $node['label'] }}{!! $star !!}</legend>
        @if (! empty($node['description']))<p class="-mt-1 text-caption text-muted-foreground">{{ $node['description'] }}</p>@endif

        @if ($mode === 'checkboxes')
            <div class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                @foreach ($item['field']['options'] as $o)
                    <label class="flex min-h-control items-center gap-2 text-body-sm text-foreground">
                        <x-nq::checkbox x-model="c[{{ nq_sf_p($pre, $suf.'::'.$o['value']) }}]" />
                        <span class="min-w-0">{{ $o['label'] }}</span>
                    </label>
                @endforeach
            </div>
        @elseif ($mode === 'items')
            <div class="flex flex-col gap-2">
                <template x-for="({{ $rv }}, {{ 'i'.$lv }}) in rows({{ $P }})" :key="{{ $row('key') }}">
                    <div x-bind:data-item-key="{{ $row('key') }}" x-bind:data-schema-path="{{ $row('path') }}">
                        <div class="flex items-start gap-2">
                            <div class="min-w-0 flex-1">
                                @include('nasaq::components.schema-form._control', ['field' => $item['field'], 'P' => $RP, 'label' => $node['itemLabel'], 'ariaJs' => true])
                            </div>
                            <x-nq::button type="button" variant="ghost" size="icon" class="text-muted-foreground hover:text-nq-danger-text" data-action="remove"
                                x-bind:aria-label="itemName({{ $P }}, {{ $rv }}, t.remove)" x-bind:disabled="cannotRemove({{ $P }})" x-on:click="remove({{ $P }}, {{ $rv }}.index)">
                                <x-lucide-trash-2 aria-hidden="true" />
                            </x-nq::button>
                        </div>
                        <div data-slot="field-error" role="alert" x-show="msg({{ $RP }})" x-text="msg({{ $RP }})" style="display: none" class="mt-1 text-caption text-nq-danger-text"></div>
                    </div>
                </template>
            </div>
        @else
            <div class="flex min-w-0 flex-col gap-3">
                <div x-show="count({{ $P }}) > 1" style="display: none" class="flex items-center justify-between gap-2">
                    <span class="text-caption tabular-nums text-muted-foreground" x-text="countText({{ $P }})"></span>
                    <x-nq::button type="button" variant="ghost" size="sm" x-on:click="toggleAll({{ $P }})">
                        <span x-show="allCollapsed({{ $P }})" style="display: none" class="inline-flex"><x-lucide-chevrons-up-down aria-hidden="true" /></span>
                        <span x-show="! allCollapsed({{ $P }})" class="inline-flex"><x-lucide-chevrons-down-up aria-hidden="true" /></span>
                        <span x-text="allCollapsed({{ $P }}) ? t.expandAll : t.collapseAll">{{ $t['collapseAll'] }}</span>
                    </x-nq::button>
                </div>
                <div x-show="count({{ $P }}) === 0" class="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">{{ $empty }}</div>
                <ol aria-label="{{ $node['label'] }}" class="flex flex-col gap-2">
                    <template x-for="({{ $rv }}, {{ 'i'.$lv }}) in rows({{ $P }})" :key="{{ $row('key') }}">
                        <li x-show="visible({{ $row('path') }})" data-slot="schema-form-group" x-bind:data-item-key="{{ $row('key') }}" x-bind:data-schema-path="{{ $row('path') }}"
                            x-bind:data-collapsed="isCollapsed({{ $row('key') }}) ? '' : null" x-bind:data-dragging="dragging({{ $P }}, {{ $rv }}.index) ? '' : null"
                            x-bind:style="rowStyle({{ $P }}, {{ $rv }}.index)"
                            class="relative rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating">
                            <div data-slot="schema-form-group-header" class="flex min-h-control items-center gap-1 p-1.5">
                                <span aria-hidden="true" x-show="count({{ $P }}) > 1" style="display: none" x-bind:title="itemName({{ $P }}, {{ $rv }}, t.drag)" x-on:pointerdown="dragStart({{ $P }}, {{ $rv }}.index, $event)"
                                    class="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground hover:bg-nq-hover hover:text-foreground active:cursor-grabbing [&_svg]:size-4">
                                    <x-lucide-grip-vertical aria-hidden="true" />
                                </span>
                                <button type="button" x-bind:aria-expanded="isCollapsed({{ $row('key') }}) ? 'false' : 'true'" x-bind:aria-controls="'body-' + {{ $row('key') }}"
                                    x-bind:aria-label="itemName({{ $P }}, {{ $rv }}, isCollapsed({{ $row('key') }}) ? t.expand : t.collapse)" x-on:click="toggleRow({{ $row('key') }})"
                                    class="flex min-h-control-sm min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                    <span aria-hidden="true" x-bind:class="isCollapsed({{ $row('key') }}) ? '' : 'rotate-90 rtl:-rotate-90'" class="inline-flex shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-nq rtl:-scale-x-100 [&_svg]:size-4"><x-lucide-chevron-right aria-hidden="true" /></span>
                                    <span class="min-w-0 truncate text-label text-foreground" x-text="{{ $row('title') }}"></span>
                                    <span x-show="isCollapsed({{ $row('key') }}) && {{ $row('summary') }}" style="display: none" class="min-w-0 flex-1 truncate text-body-sm text-muted-foreground" x-text="{{ $row('summary') }}"></span>
                                </button>
                                <span class="sr-only" x-text="fmt({{ $rv }}.index + 1)"></span>
                                <x-nq::badge variant="danger" data-slot="schema-form-group-issues" x-show="hasIssues({{ $row('path') }})" style="display: none" x-text="issuesText({{ $row('path') }})" />
                                <x-nq::button type="button" variant="ghost" size="icon-sm" data-action="up" x-bind:aria-label="itemName({{ $P }}, {{ $rv }}, t.moveUp)" x-bind:disabled="cannotMove({{ $P }}, {{ $rv }}.index, -1)" x-on:click="move({{ $P }}, {{ $rv }}.index, {{ $rv }}.index - 1)">
                                    <x-lucide-chevron-up aria-hidden="true" />
                                </x-nq::button>
                                <x-nq::button type="button" variant="ghost" size="icon-sm" data-action="down" x-bind:aria-label="itemName({{ $P }}, {{ $rv }}, t.moveDown)" x-bind:disabled="cannotMove({{ $P }}, {{ $rv }}.index, 1)" x-on:click="move({{ $P }}, {{ $rv }}.index, {{ $rv }}.index + 1)">
                                    <x-lucide-chevron-down aria-hidden="true" />
                                </x-nq::button>
                                <x-nq::button type="button" variant="ghost" size="icon-sm" data-action="remove" class="text-muted-foreground hover:text-nq-danger-text" x-bind:aria-label="itemName({{ $P }}, {{ $rv }}, t.remove)" x-bind:disabled="cannotRemove({{ $P }})" x-on:click="ask({{ $P }}, {{ $rv }}.index)">
                                    <x-lucide-trash-2 aria-hidden="true" />
                                </x-nq::button>
                            </div>
                            <div x-bind:id="'body-' + {{ $row('key') }}" data-slot="schema-form-group-body" x-bind:hidden="isCollapsed({{ $row('key') }})" class="border-t border-border p-3 sm:p-4">
                                <div class="flex min-w-0 flex-col gap-4">
                                    @include('nasaq::components.schema-form._node', ['node' => $item, 'pre' => $rv.'.path', 'suf' => '', 'depth' => 1, 'lv' => $lv + 1])
                                </div>
                            </div>
                        </li>
                    </template>
                </ol>
            </div>
        @endif

        @if ($mode === 'items' || $mode === 'groups')
            <div class="flex flex-wrap items-center gap-3">
                <x-nq::button type="button" variant="secondary" data-slot="schema-form-add" x-bind:disabled="atMax({{ $P }})" x-on:click="add({{ $P }})">
                    <x-lucide-plus aria-hidden="true" />
                    {{ $add }}
                </x-nq::button>
                <span x-show="limit({{ $P }})" x-text="limit({{ $P }})" style="display: none" class="text-caption text-muted-foreground"></span>
            </div>
        @endif

        <p role="alert" data-slot="schema-form-list-error" x-show="msg({{ $P }})" x-text="msg({{ $P }})" style="display: none" class="text-caption text-nq-danger-text"></p>

        @if ($mode === 'groups')
            <x-nq::alert-dialog x-model="dlg[{{ $P }}]">
                <x-nq::alert-dialog.content>
                    <x-nq::alert-dialog.header>
                        <x-nq::alert-dialog.title><span x-text="removeTitle({{ $P }})"></span></x-nq::alert-dialog.title>
                        <x-nq::alert-dialog.description>{{ $t['removeBody'] }}</x-nq::alert-dialog.description>
                    </x-nq::alert-dialog.header>
                    <x-nq::alert-dialog.footer>
                        <x-nq::alert-dialog.cancel>{{ $t['cancel'] }}</x-nq::alert-dialog.cancel>
                        <x-nq::alert-dialog.action x-on:click="confirmRemove({{ $P }})">{{ $t['removeConfirm'] }}</x-nq::alert-dialog.action>
                    </x-nq::alert-dialog.footer>
                </x-nq::alert-dialog.content>
            </x-nq::alert-dialog>
        @endif
    </fieldset>
@endif

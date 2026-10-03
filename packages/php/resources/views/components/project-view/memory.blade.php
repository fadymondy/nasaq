{{-- <x-nq::project-view.memory :items="$memory" editable deletable />
     The Memory tab of x-nq::project-view: facts and decisions the project remembers, with a search, kind and tag filters, add, edit and forget (with a confirm).
     items: [['id', 'kind' => fact|decision, 'text', 'tags' => [], 'source', 'at']]. editable: shows Add and Edit. deletable: shows Forget.
     The list is drawn by the server; the filters, the two dialogs and the events (nq-project-memory-save { input, id?, wait }, nq-project-memory-forget { id, wait }) belong to the enclosing x-nq::project-view.
     text: array overriding the words (see x-nq::project-view). locale: default the app locale. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.project-view._logic')
@props(['items' => [], 'editable' => false, 'deletable' => false, 'text' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = nq_pv_words($locale, (array) $text);
    $items = nq_pv_memory_sorted((array) $items);
    $tags = nq_pv_memory_tags($items);
    $date = fn ($v) => nq_pv_date($v, $ar, true);
    $hay = fn ($m) => mb_strtolower(trim(($m['text'] ?? '').' '.implode(' ', (array) ($m['tags'] ?? [])).' '.($m['source'] ?? '')));
    $uid = 'nq-pv-mem-'.substr(md5(json_encode(array_column($items, 'id'))), 0, 6);
    $chip = 'inline-flex shrink-0 items-center gap-1.5';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'project-memory') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-0.5">
            <h2 class="m-0 text-h3">{{ $t['memoryTitle'] }}</h2>
            <p class="m-0 text-body-sm text-muted-foreground">{{ $t['memoryHint'] }} <span>{{ sprintf($t['memoryCount'], number_format(count($items))) }}</span></p>
        </div>
        @if ($editable)
            <x-nq::button x-on:click="openMemory(-1)"><x-lucide-plus aria-hidden="true" />{{ $t['memoryAdd'] }}</x-nq::button>
        @endif
    </div>

    <div class="flex min-w-0 flex-col gap-3">
        <div class="relative">
            <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
            <x-nq::field.input type="search" x-model="memQuery" aria-label="{{ $t['memorySearch'] }}" placeholder="{{ $t['memorySearch'] }}" class="ps-9" />
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2">
            <div role="group" aria-label="{{ $t['memoryKindFilter'] }}" class="flex flex-wrap gap-1.5">
                @foreach (['all' => $t['memoryAllKinds'], 'fact' => $t['memoryKindsPlural']['fact'], 'decision' => $t['memoryKindsPlural']['decision']] as $k => $label)
                    <x-nq::button size="sm" variant="primary" aria-pressed="true" data-k="{{ $k }}" x-show="memKind === $el.dataset.k" x-cloak style="display: none" x-on:click="memKind = $el.dataset.k">{{ $label }}</x-nq::button>
                    <x-nq::button size="sm" variant="secondary" aria-pressed="false" data-k="{{ $k }}" x-show="memKind !== $el.dataset.k" x-on:click="memKind = $el.dataset.k">{{ $label }}</x-nq::button>
                @endforeach
            </div>
            @if (count($tags))
                <div role="group" aria-label="{{ $t['memoryTagFilter'] }}" class="flex flex-wrap gap-1.5">
                    @foreach ($tags as $x)
                        <x-nq::button size="sm" variant="primary" aria-pressed="true" data-tag="{{ $x['tag'] }}" x-show="memTags.includes($el.dataset.tag)" x-cloak style="display: none" x-on:click="toggleMemTag($el.dataset.tag)"><bdi>#{{ $x['tag'] }}</bdi> <span class="opacity-70"><x-nq::numeric :value="$x['count']" :locale="$locale" /></span></x-nq::button>
                        <x-nq::button size="sm" variant="secondary" aria-pressed="false" data-tag="{{ $x['tag'] }}" x-show="! memTags.includes($el.dataset.tag)" x-on:click="toggleMemTag($el.dataset.tag)"><bdi>#{{ $x['tag'] }}</bdi> <span class="opacity-70"><x-nq::numeric :value="$x['count']" :locale="$locale" /></span></x-nq::button>
                    @endforeach
                </div>
            @endif
            <x-nq::button size="sm" variant="ghost" x-show="memFiltered()" x-cloak style="display: none" x-on:click="clearMemory()"><x-lucide-x aria-hidden="true" />{{ $t['memoryClear'] }}</x-nq::button>
        </div>
    </div>

    @if (count($items) === 0)
        <x-nq::states.empty :title="$t['memoryEmpty']" :description="$t['memoryEmptyHint']" icon="book-marked" />
    @else
        <div data-mem-nomatch hidden>
            <x-nq::states.empty :title="$t['memoryNoMatch']" :description="$t['memoryNoMatchHint']" icon="book-marked" />
        </div>
        <ul data-mem-list x-effect="applyMemory()" class="m-0 flex list-none flex-col gap-3 p-0" aria-label="{{ $t['memoryTitle'] }}">
            @foreach ($items as $n => $m)
                @php $kind = $m['kind'] ?? 'fact'; $snippet = mb_substr($m['text'], 0, 40); @endphp
                <li data-mem-item data-kind="{{ $kind }}" data-tags="{{ implode('|', (array) ($m['tags'] ?? [])) }}" data-hay="{{ $hay($m) }}">
                    <x-nq::card>
                        <x-nq::card.content class="flex min-w-0 flex-col gap-2 pt-4">
                            <div class="flex min-w-0 items-start justify-between gap-3">
                                <div class="flex min-w-0 items-start gap-3">
                                    <span aria-hidden="true" class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                                        @if ($kind === 'decision')<x-lucide-gavel />@else<x-lucide-lightbulb />@endif
                                    </span>
                                    <p dir="auto" class="m-0 min-w-0 whitespace-pre-wrap break-words text-body">{{ $m['text'] }}</p>
                                </div>
                                <div class="flex shrink-0 items-center gap-1">
                                    @if ($editable)
                                        <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $t['memoryEdit'] }}: {{ $snippet }}" x-on:click="openMemory({{ $n }})"><x-lucide-pencil aria-hidden="true" /></x-nq::button>
                                    @endif
                                    @if ($deletable)
                                        <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ $t['memoryForget'] }}: {{ $snippet }}" x-on:click="askForget({{ $n }})"><x-lucide-trash-2 aria-hidden="true" /></x-nq::button>
                                    @endif
                                </div>
                            </div>
                            <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 ps-11 text-caption text-muted-foreground">
                                <x-nq::badge :variant="$kind === 'decision' ? 'info' : 'outline'">{{ $t['memoryKinds'][$kind] }}</x-nq::badge>
                                @foreach ((array) ($m['tags'] ?? []) as $tag)
                                    <button type="button" data-tag="{{ $tag }}" x-on:click="toggleMemTag($el.dataset.tag)" class="cursor-pointer rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><bdi>#{{ $tag }}</bdi></button>
                                @endforeach
                                @if (! empty($m['source']))
                                    <span>{{ $t['memoryFrom'] }} <span class="text-foreground">{{ $m['source'] }}</span></span>
                                @endif
                                <span>{{ $date($m['at']) }}</span>
                            </div>
                        </x-nq::card.content>
                    </x-nq::card>
                </li>
            @endforeach
        </ul>
    @endif

    @if ($editable)
        <x-nq::dialog x-model="memOpen">
            <x-nq::dialog.content>
                <form class="flex flex-col gap-4" x-on:submit.prevent="saveMemory()">
                    <x-nq::dialog.header>
                        <x-nq::dialog.title><span x-show="memEditing === -1">{{ $t['memoryAddTitle'] }}</span><span x-show="memEditing !== -1" x-cloak style="display: none">{{ $t['memoryEditTitle'] }}</span></x-nq::dialog.title>
                    </x-nq::dialog.header>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['memoryText'] }}</x-nq::field.label>
                        <x-nq::field.textarea rows="4" dir="auto" x-model="memText" />
                    </x-nq::field>
                    <div class="flex flex-col gap-1.5">
                        <span id="{{ $uid }}-kind" class="text-label">{{ $t['memoryKind'] }}</span>
                        <x-nq::select value="fact" x-model="memFormKind">
                            <x-nq::select.trigger aria-labelledby="{{ $uid }}-kind"><x-nq::select.value /></x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach (['fact', 'decision'] as $k)
                                    <x-nq::select.item :value="$k">{{ $t['memoryKinds'][$k] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </div>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['memoryTags'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="memTagsText" />
                        <x-nq::field.description>{{ $t['memoryTagsHint'] }}</x-nq::field.description>
                    </x-nq::field>
                    <x-nq::field>
                        <x-nq::field.label>{{ $t['memorySource'] }}</x-nq::field.label>
                        <x-nq::field.input x-model="memSource" />
                        <x-nq::field.description>{{ $t['memorySourceHint'] }}</x-nq::field.description>
                    </x-nq::field>
                    <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="memError" x-cloak style="display: none" x-text="memError"></p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-bind:disabled="memBusy" x-on:click="memOpen = false">{{ $t['cancel'] }}</x-nq::button>
                        <x-nq::button type="submit" x-bind:disabled="memBusy">{{ $t['save'] }}</x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($deletable)
        <x-nq::dialog x-model="forgetOpen">
            <x-nq::dialog.content>
                <x-nq::dialog.header>
                    <x-nq::dialog.title>{{ $t['memoryForgetTitle'] }}</x-nq::dialog.title>
                    <x-nq::dialog.description>{{ $t['memoryForgetBody'] }}</x-nq::dialog.description>
                </x-nq::dialog.header>
                <p dir="auto" class="m-0 rounded-md border border-border bg-secondary px-3 py-2 text-body-sm" x-text="forgetText"></p>
                <p role="alert" class="m-0 text-body-sm text-nq-danger-text" x-show="forgetError" x-cloak style="display: none" x-text="forgetError"></p>
                <x-nq::dialog.footer>
                    <x-nq::button variant="ghost" x-bind:disabled="forgetBusy" x-on:click="forgetOpen = false">{{ $t['cancel'] }}</x-nq::button>
                    <x-nq::button variant="danger" x-bind:disabled="forgetBusy" x-on:click="forgetMemory()">{{ $t['memoryForget'] }}</x-nq::button>
                </x-nq::dialog.footer>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif
</div>

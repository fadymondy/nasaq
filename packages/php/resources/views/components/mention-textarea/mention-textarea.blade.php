{{-- <x-nq::mention-textarea :suggestions="[['id' => 'u1', 'name' => 'Sara Ali', 'description' => 'Design lead']]" rows="4" placeholder="Type @ to mention someone" />
     A textarea that suggests people when you type the trigger (@). Focus stays in the textarea (ARIA combobox with a listbox); choosing a suggestion inserts "@name " and records it.
     suggestions: rows of id, name, description, avatar, kind (person | team | group; the list is sectioned by kind), handle, presence (online | away | busy | offline), keywords.
     value: the text. mentions: the mentions already in it, [['id' => 'u1', 'name' => 'Sara Ali', 'start' => 0, 'end' => 9]]. trigger: default "@". max-suggestions: default 8.
     name: the textarea's name; mentions-name: renders one hidden input per mention id (name[]). list-label / empty-label override the words. wrapper-class styles the wrapper (class goes to the textarea).
     x-model works on the text (x-modelable="text"); every change bubbles "nq-mentions-change" ({ mentions: [{ id, name, start, end }] }). Works inside <x-nq::field>. Needs the Alpine runtime (@nasaqScripts). --}}
@aware(['invalid' => false, 'disabled' => false, 'name' => null])
@props(['suggestions' => [], 'value' => '', 'mentions' => [], 'trigger' => '@', 'maxSuggestions' => 8, 'listLabel' => null, 'emptyLabel' => null, 'wrapperClass' => null, 'mentionsName' => null])
@php
    $strings = [
        'list' => $listLabel ?? \Nasaq\Nasaq::t('Mentions', 'الإشارات'),
        'empty' => $emptyLabel ?? \Nasaq\Nasaq::t('No matches', 'لا نتائج'),
        'count' => \Nasaq\Nasaq::t('{n} suggestions', '{n} اقتراحات'),
        'person' => \Nasaq\Nasaq::t('People', 'الأشخاص'),
        'team' => \Nasaq\Nasaq::t('Teams', 'الفرق'),
        'group' => \Nasaq\Nasaq::t('Groups', 'المجموعات'),
        'teamOne' => \Nasaq\Nasaq::t('Team', 'فريق'),
        'groupOne' => \Nasaq\Nasaq::t('Group', 'مجموعة'),
    ];
    $optionsJs = \Illuminate\Support\Js::from((object) array_filter([
        'suggestions' => array_values($suggestions),
        'mentions' => $mentions ?: null,
        'trigger' => $trigger !== '@' ? $trigger : null,
        'maxSuggestions' => $maxSuggestions != 8 ? (int) $maxSuggestions : null,
        'strings' => $strings,
    ], fn ($v) => $v !== null))->toHtml();
    $own = ['x-model', 'x-on:nq-mentions-change', '@nq-mentions-change'];
    $avatar = 'inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground size-6 text-[10px] rounded-full';
@endphp
<div data-slot="mention-textarea" x-data="nqMentionTextarea(@js((string) $value), {!! $optionsJs !!})" x-modelable="text" x-id="['nq-mention']"
    {{ $attributes->only($own)->cn('relative w-full', $wrapperClass) }}>
    <x-nq::field.textarea x-bind="area" x-ref="area" {{ $attributes->except($own) }}>{{ $value }}</x-nq::field.textarea>
    <ul x-show="open()" x-cloak :id="listId()" role="listbox" aria-label="{{ $strings['list'] }}" data-slot="mention-list" :style="listStyle()" @mousedown.prevent
        class="absolute z-50 max-h-56 w-64 max-w-full overflow-y-auto rounded-floating border border-border bg-popover p-1 text-body-sm text-popover-foreground shadow-floating">
        <template x-for="r in rows()" :key="r.key">
            <li x-bind="row(r)">
                <span x-show="r.type === 'heading'" x-text="r.type === 'heading' ? heading(r.kind) : ''"></span>
                <span x-show="r.type === 'option' && (r.option.kind ?? 'person') === 'person'" class="relative inline-flex shrink-0">
                    <span data-slot="avatar" aria-hidden="true" class="{{ $avatar }}">
                        <img x-show="r.type === 'option' && r.option.avatar" data-slot="avatar-image" :src="r.type === 'option' ? r.option.avatar : null" alt="" class="size-full object-cover" style="display: none">
                        <span x-show="r.type === 'option' && ! r.option.avatar" data-slot="avatar-fallback" class="flex size-full items-center justify-center" x-text="r.type === 'option' ? initials(r.option.name) : ''"></span>
                    </span>
                    <span x-show="r.type === 'option' && r.option.presence" style="display: none" data-slot="presence-dot" aria-hidden="true"
                        :data-presence="r.type === 'option' ? r.option.presence : null"
                        :class="r.type === 'option' && r.option.presence ? presenceClass(r.option.presence) : ''"
                        class="absolute -end-0.5 -bottom-0.5 inline-block size-2.5 shrink-0 rounded-full border-2 border-popover"></span>
                </span>
                <span x-show="r.type === 'option' && (r.option.kind ?? 'person') !== 'person'" style="display: none" aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center rounded-control bg-secondary text-secondary-foreground">
                    <span class="flex [&_svg]:size-3.5"><x-lucide-users /></span>
                </span>
                <span x-show="r.type === 'option'" class="flex min-w-0 flex-col">
                    <span class="truncate text-label text-foreground">
                        <span x-text="r.type === 'option' ? r.option.name : ''"></span>
                        <span x-show="r.type === 'option' && (r.option.kind ?? 'person') !== 'person'" style="display: none" class="sr-only" x-text="r.type === 'option' ? ' (' + kindLabel(r.option.kind) + ')' : ''"></span>
                    </span>
                    <span x-show="r.type === 'option' && r.option.description" style="display: none" class="truncate text-caption text-muted-foreground" x-text="r.type === 'option' ? r.option.description : ''"></span>
                </span>
            </li>
        </template>
    </ul>
    <div x-show="emptyShown()" x-cloak data-slot="mention-empty" :style="listStyle()"
        class="absolute z-50 w-64 max-w-full rounded-floating border border-border bg-popover px-3 py-2 text-body-sm text-muted-foreground shadow-floating">{{ $strings['empty'] }}</div>
    <span role="status" class="sr-only" x-text="status()"></span>
    @if ($mentionsName)
        <template x-for="m in mentionsNow()" :key="m.id + ':' + m.start"><input type="hidden" name="{{ $mentionsName }}[]" :value="m.id"></template>
    @endif
</div>

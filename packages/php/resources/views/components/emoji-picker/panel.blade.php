{{-- <x-nq::emoji-picker.panel />   The picker's body on its own: search, a skin-tone button and a categorised emoji grid with arrow-key navigation.
     Emoji come from Emojibase (CDN, cached per page) in the page language, or English where it has none (Arabic). To supply the data yourself set
     window.nqEmojiData = (locale) => Promise<{ emojis, categories }> before the page loads. skin-tone: none|light|medium-light|medium|medium-dark|dark. columns (8).
     Choosing dispatches an "emoji-select" event ({ emoji, label }). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['skinTone' => 'none', 'columns' => 8])
@php
    $search = \Nasaq\Nasaq::t('Search emoji', 'ابحث عن رمز تعبيري');
    $tone = \Nasaq\Nasaq::t('Change skin tone', 'تغيير لون البشرة');
    $loading = \Nasaq\Nasaq::t('Loading emoji…', 'جارٍ تحميل الرموز…');
    $empty = \Nasaq\Nasaq::t('No emoji found for “:q”.', 'لا توجد رموز مطابقة لـ «:q».');
    $lit = fn (string $s) => '`'.str_replace(['`', '${', chr(92)], '', $s).'`';
@endphp
<div data-slot="emoji-picker" x-data="nqEmojiPicker(@js($skinTone), @js((int) $columns))" x-on:keydown="onKey($event)"
    {{ $attributes->cn('isolate flex h-80 w-72 flex-col bg-popover text-popover-foreground') }}>
    <div class="flex items-center gap-2 border-b border-border p-2">
        <div class="relative min-w-0 flex-1">
            <x-nq::icon name="search" aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
            <input x-model="query" type="search" data-slot="emoji-picker-search" aria-label="{{ $search }}" placeholder="{{ $search }}"
                class="h-control-sm w-full min-w-0 rounded-control border border-input bg-card ps-8 pe-2 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus">
        </div>
        <button type="button" data-slot="emoji-picker-skin-tone" aria-label="{{ $tone }}" x-on:click="cycleTone()" x-text="toneGlyph"
            class="inline-flex size-control-sm shrink-0 items-center justify-center rounded-control text-body outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">✋</button>
    </div>
    <div data-slot="emoji-picker-viewport" class="relative flex-1 overflow-y-auto outline-none">
        <div x-show="! data" role="status" class="absolute inset-0 flex items-center justify-center text-body-sm text-muted-foreground">{{ $loading }}</div>
        <div x-show="data &amp;&amp; ! count" style="display:none" role="status" class="absolute inset-0 flex items-center justify-center px-4 text-center text-body-sm text-muted-foreground"
            x-text="{{ $lit($empty) }}.replace(`:q`, query)"></div>
        <div x-show="data &amp;&amp; count > 0" style="display:none" role="grid" class="select-none pb-1">
            <template x-for="s in sections" x-bind:key="s.index">
                <section>
                    <div data-slot="emoji-picker-category" class="sticky top-0 bg-popover px-3 py-1.5 text-start text-caption font-medium text-muted-foreground" x-text="s.label"></div>
                    <div data-slot="emoji-picker-row" class="grid scroll-my-1 px-1.5" style="grid-template-columns: repeat({{ (int) $columns }}, minmax(0, 1fr)); justify-items: center">
                        <template x-for="item in s.items" x-bind:key="item.emoji.emoji">
                            <button type="button" data-slot="emoji-picker-emoji" role="gridcell"
                                x-bind:aria-label="item.emoji.label" x-bind:data-index="item.flat" x-bind:data-active="item.flat === active ? '' : null"
                                x-bind:tabindex="item.flat === active ? 0 : -1" x-on:click="pick(item.emoji)" x-on:focus="active = item.flat" x-text="glyph(item.emoji)"
                                class="flex size-8 items-center justify-center rounded-control text-[20px] leading-none outline-none hover:bg-nq-hover data-[active]:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"></button>
                        </template>
                    </div>
                </section>
            </template>
        </div>
    </div>
</div>

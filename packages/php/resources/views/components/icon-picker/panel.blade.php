{{-- <x-nq::icon-picker.panel x-model="icon" />   The picker's body on its own: search, category tabs, an icon grid with arrow-key navigation, "Show more" and recent icons.
     The built-in set is about 220 lucide icons with English and Arabic search words. icons: your own list, [['name'=>'house','category'=>'general','keywords'=>'home','keywordsAr'=>'بيت']].
     value: the chosen kebab-case name (x-modelable). Choosing dispatches a "select" event ({ name }). columns (8), page-size (96), recent-key (localStorage key, '' for memory only), auto-focus.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['value' => null, 'icons' => null, 'columns' => 8, 'pageSize' => 96, 'recentKey' => 'nasaq:icon-picker:recent', 'autoFocus' => false])
@php
    $rows = $icons ?? array_map(fn ($r) => ['name' => $r[0], 'category' => $r[1], 'keywords' => $r[2], 'keywordsAr' => $r[3]], require app('view')->getFinder()->find('nasaq::components.icon-picker.catalog'));
    $order = ['general', 'files', 'communication', 'business', 'commerce', 'data', 'people', 'dev', 'media', 'design', 'nature', 'travel', 'health'];
    $seen = array_values(array_unique(array_column($rows, 'category')));
    $categories = array_merge(array_values(array_intersect($order, $seen)), array_values(array_diff($seen, $order)));
    $names = \Nasaq\Nasaq::rtl() ? [
        'general' => 'عام', 'files' => 'الملفات', 'communication' => 'التواصل', 'business' => 'الأعمال', 'commerce' => 'التجارة', 'data' => 'البيانات', 'people' => 'الأشخاص',
        'dev' => 'التطوير', 'media' => 'الوسائط', 'design' => 'التصميم', 'nature' => 'الطبيعة', 'travel' => 'السفر', 'health' => 'الصحة والطعام',
    ] : [
        'general' => 'General', 'files' => 'Files', 'communication' => 'Communication', 'business' => 'Business', 'commerce' => 'Commerce', 'data' => 'Data', 'people' => 'People',
        'dev' => 'Developer', 'media' => 'Media', 'design' => 'Design', 'nature' => 'Nature', 'travel' => 'Travel', 'health' => 'Health and food',
    ];
    $search = \Nasaq\Nasaq::t('Search icons', 'ابحث عن أيقونة');
    $grid = \Nasaq\Nasaq::t('Icons', 'الأيقونات');
    $recentLabel = \Nasaq\Nasaq::t('Recent', 'الأحدث استخدامًا');
    $showMore = \Nasaq\Nasaq::t('Show :n more', 'عرض :n أخرى');
    $results = \Nasaq\Nasaq::t(':n icons', ':n أيقونة');
    $empty = \Nasaq\Nasaq::t('No icons match “:q”.', 'لا توجد أيقونات مطابقة لـ «:q».');
    // Strings go into x-text as template literals, so quotes in them cannot break the attribute.
    $lit = fn (string $s) => '`'.str_replace(['`', '${', chr(92)], '', $s).'`';
@endphp
<div data-slot="icon-picker" x-data="nqIconPicker(@js($value), @js((int) $columns), @js((int) $pageSize), @js((string) $recentKey))" x-modelable="value"
    {{ $attributes->cn('flex w-80 max-w-full flex-col bg-popover text-popover-foreground') }}
    @if ($autoFocus) x-init="$nextTick(() => $refs.search.focus())" @endif>
    <div class="relative border-b border-border p-2">
        <x-nq::icon name="search" class="pointer-events-none absolute inset-y-0 start-5 my-auto size-4 text-muted-foreground" />
        <input x-ref="search" x-model="query" type="search" aria-label="{{ $search }}" placeholder="{{ $search }}" x-on:keydown="onSearchKey($event)"
            class="h-control-sm w-full min-w-0 rounded-control border border-input bg-card ps-8 pe-2 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus">
    </div>

    <div role="tablist" aria-label="{{ $grid }}" class="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5 [scrollbar-width:none]">
        @foreach ([null, ...$categories] as $c)
            @php
                $label = $c === null ? \Nasaq\Nasaq::t('All', 'الكل') : ($names[$c] ?? $c);
                $key = $c === null ? 'null' : $lit($c);
            @endphp
            <button type="button" role="tab"
                x-on:click="category = {{ $key }}"
                x-bind:aria-selected="category === {{ $key }} ? 'true' : 'false'"
                x-bind:class="category === {{ $key }} ? 'bg-nq-selected text-foreground font-medium' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground'"
                class="shrink-0 rounded-full px-2.5 py-1 text-caption outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $label }}</button>
        @endforeach
    </div>

    <div class="max-h-64 overflow-y-auto p-2">
        <div x-show="! query &amp;&amp; ! category &amp;&amp; recent.filter((n) => known(n)).length > 0" style="display:none" class="mb-2 flex flex-col gap-1" data-slot="icon-picker-recent">
            <div class="px-1 text-caption font-medium text-muted-foreground">{{ $recentLabel }}</div>
            <div class="flex flex-wrap gap-0.5" role="group" aria-label="{{ $recentLabel }}">
                <template x-for="name in recent.filter((n) => known(n))" x-bind:key="name">
                    <button type="button" x-bind:aria-label="name" x-bind:title="name" x-bind:aria-pressed="value === name ? 'true' : 'false'" x-on:click="choose(name)" x-html="glyph(name)"
                        class="flex size-9 items-center justify-center rounded-control text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-nq-selected [&_svg]:size-5"></button>
                </template>
            </div>
        </div>

        <div role="listbox" aria-label="{{ $grid }}" x-show="total > 0" class="grid gap-0.5" x-on:keydown="onGridKey($event)"
            style="grid-template-columns: repeat({{ (int) $columns }}, minmax(0, 1fr)); justify-items: center">
            @foreach ($rows as $row)
                <button type="button" role="option" aria-selected="false" aria-label="{{ $row['name'] }}" title="{{ $row['name'] }}" tabindex="-1"
                    data-slot="icon-picker-tile" data-name="{{ $row['name'] }}" data-category="{{ $row['category'] }}" data-keywords="{{ trim(($row['keywords'] ?? '').' '.($row['keywordsAr'] ?? '')) }}"
                    x-on:click="choose({{ $lit($row['name']) }})"
                    class="flex size-9 items-center justify-center rounded-control text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[selected]:bg-nq-selected data-[selected]:font-medium [&_svg]:size-5"
                    @if ($loop->index >= $pageSize) style="display:none" @endif>
                    <x-nq::icon :name="$row['name']" class="size-5" />
                </button>
            @endforeach
        </div>
        <p x-show="total === 0" style="display:none" class="px-2 py-8 text-center text-body-sm text-muted-foreground" x-text="{{ $lit($empty) }}.replace(`:q`, query)"></p>

        <div x-show="remaining > 0" class="mt-2 flex justify-center">
            <x-nq::button variant="ghost" size="sm" x-on:click="showMore()"><span x-text="{{ $lit($showMore) }}.replace(`:n`, new Intl.NumberFormat($nq.locale).format(remaining))">{{ str_replace(':n', max(0, count($rows) - $pageSize), $showMore) }}</span></x-nq::button>
        </div>
    </div>
    <p role="status" class="sr-only" x-text="{{ $lit($results) }}.replace(`:n`, new Intl.NumberFormat($nq.locale).format(total))"></p>
</div>

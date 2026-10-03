{{-- <x-nq::settings-sections title="Settings" value="notifications" :groups="$groups" :dirty="0"> <x-nq::settings-sections.page id="notifications"> … </x-nq::settings-sections.page> </x-nq::settings-sections>
     A settings page with grouped sections. A nav on the side (a select on narrow screens), a search that finds individual
     settings across every page, and a save bar that sticks to the bottom while anything is unsaved.
     groups: [['id' => 'general', 'label' => 'General', 'pages' => [['id' => 'notifications', 'label' => 'Notifications', 'icon' => 'bell' (a lucide name),
       'description' =>, 'keywords' => [], 'tone' => 'danger', 'entries' => [['id' => 'email', 'label' => 'Email digest', 'description' =>, 'keywords' => []]]]]]].
     value: the active page id (x-modelable: x-model, wire:model). Pass it so the right page renders before Alpine starts; defaults to the first page in the nav.
     title / description: replace the localised text; description="false" hides it. dirty: unsaved change count (number) or true. 0 hides the bar.
     searchable="false" hides the search box. labels: an array overriding the built-in strings.
     The component does not own your values. From inside it, dispatch nq-settings-dirty ({ detail: 2 } or true); on it, listen for
     nq-settings-save and nq-settings-discard, calling event.detail.waitUntil(promise) (resolve { error: "…" } to keep the bar open).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['groups' => [], 'value' => null, 'title' => null, 'description' => null, 'dirty' => 0, 'searchable' => true, 'labels' => []])
@php
    $groups = collect($groups)->map(fn ($g) => (array) $g)->all();
    $pages = collect($groups)->flatMap(fn ($g) => collect($g['pages'])->map(fn ($p) => (array) $p + ['group' => $g]))->values();
    $value ??= $pages->first()['id'] ?? '';
    $active = $pages->firstWhere('id', $value) ?? $pages->first();
    $uid = 'nq-settings-'.substr(md5(json_encode($groups)), 0, 6);
    $hideDescription = $description === false || $description === 'false';
    $t = array_merge([
        'title' => \Nasaq\Nasaq::t('Settings', 'الإعدادات'),
        'description' => \Nasaq\Nasaq::t('Manage your workspace, grouped by topic.', 'أدِر مساحة عملك، مجمّعة حسب الموضوع.'),
        'nav' => \Nasaq\Nasaq::t('Settings sections', 'أقسام الإعدادات'),
        'search' => \Nasaq\Nasaq::t('Search settings…', 'ابحث في الإعدادات…'),
        'searchLabel' => \Nasaq\Nasaq::t('Search settings', 'البحث في الإعدادات'),
        'clear' => \Nasaq\Nasaq::t('Clear search', 'مسح البحث'),
        'results' => \Nasaq\Nasaq::t('{n} results', '{n} نتائج'),
        'resultsOne' => \Nasaq\Nasaq::t('1 result', 'نتيجة واحدة'),
        'noResults' => \Nasaq\Nasaq::t('No settings match', 'لا توجد إعدادات مطابقة'),
        'unsaved' => \Nasaq\Nasaq::t('{n} unsaved changes', '{n} تغييرات غير محفوظة'),
        'unsavedOne' => \Nasaq\Nasaq::t('1 unsaved change', 'تغيير واحد غير محفوظ'),
        'unsavedSome' => \Nasaq\Nasaq::t('You have unsaved changes', 'لديك تغييرات غير محفوظة'),
        'save' => \Nasaq\Nasaq::t('Save changes', 'حفظ التغييرات'),
        'discard' => \Nasaq\Nasaq::t('Discard', 'تجاهل'),
        'saving' => \Nasaq\Nasaq::t('Saving…', 'جارٍ الحفظ…'),
        'saved' => \Nasaq\Nasaq::t('All changes saved', 'تم حفظ كل التغييرات'),
        'failed' => \Nasaq\Nasaq::t('Could not save your changes. Try again.', 'تعذّر حفظ تغييراتك. حاول مرة أخرى.'),
        'section' => \Nasaq\Nasaq::t('Section', 'القسم'),
    ], (array) $labels);
    $count = is_numeric($dirty) ? (int) $dirty : ($dirty ? 1 : 0);
    $dirtyValue = is_numeric($dirty) ? (int) $dirty : (bool) $dirty;
    $dirtyText = ! is_numeric($dirty) ? $t['unsavedSome'] : ((int) $dirty === 1 ? $t['unsavedOne'] : str_replace('{n}', (string) (int) $dirty, $t['unsaved']));
    $config = ['groups' => $groups, 'value' => $value, 'dirty' => $dirtyValue, 'labels' => $t];
    $navItem = 'flex h-nav-row w-full min-h-[var(--nq-touch-min,0px)] items-center gap-2.5 rounded-control px-3 text-start text-body-sm text-muted-foreground outline-none '
        .'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground '
        .'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus '
        .'data-[active=true]:bg-nq-selected data-[active=true]:font-medium data-[active=true]:text-foreground '
        .'[&_svg]:size-4 [&_svg]:shrink-0';
@endphp
<div data-slot="settings-sections" x-data="nqSettingsSections(@js($config))" x-modelable="value" x-id="['nq-settings']"
    {{ $attributes->cn('mx-auto flex w-full max-w-6xl flex-col gap-6') }}>
    <header class="flex flex-col gap-1">
        <h1 class="text-h1 text-foreground">{{ $title ?? $t['title'] }}</h1>
        @unless ($hideDescription)<p class="text-body text-muted-foreground">{{ $description ?? $t['description'] }}</p>@endunless
    </header>
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-10">
        <div data-slot="settings-sections-nav" class="flex min-w-0 flex-col gap-3 md:sticky md:top-4">
            @if ($searchable && $searchable !== 'false')
                <div class="relative">
                    <x-lucide-search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <x-nq::field.input type="search" x-model="query" x-on:keydown.escape="clearSearch($event)" aria-label="{{ $t['searchLabel'] }}"
                        placeholder="{{ $t['search'] }}" autocomplete="off" class="ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden" />
                    <button type="button" x-show="query" x-cloak x-on:click="query = ''" aria-label="{{ $t['clear'] }}"
                        class="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3.5" />
                    </button>
                </div>
            @endif

            <div data-slot="settings-sections-results" x-show="q" x-cloak class="flex flex-col gap-1">
                <p role="status" class="px-1 text-caption text-muted-foreground" x-text="resultsText"></p>
                <ul class="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
                    <template x-for="hit in hits" :key="hit.key">
                        <li>
                            <button type="button" x-on:click="pick(hit)"
                                class="flex w-full flex-col items-start gap-0.5 rounded-control px-3 py-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                <span class="text-body-sm font-medium text-foreground" x-text="hit.title"></span>
                                <span class="text-caption text-muted-foreground" x-text="hit.path"></span>
                            </button>
                        </li>
                    </template>
                </ul>
            </div>

            <div x-show="!q" class="flex min-w-0 flex-col gap-3">
                <div class="md:hidden">
                    <x-nq::select :value="$active['id'] ?? null" x-model="value">
                        <x-nq::select.trigger aria-label="{{ $t['section'] }}">
                            <x-nq::select.value />
                        </x-nq::select.trigger>
                        <x-nq::select.content>
                            @foreach ($groups as $group)
                                <x-nq::select.group>
                                    <x-nq::select.label>{{ $group['label'] }}</x-nq::select.label>
                                    @foreach ($group['pages'] as $page)
                                        <x-nq::select.item :value="$page['id']">{{ $page['label'] }}</x-nq::select.item>
                                    @endforeach
                                </x-nq::select.group>
                            @endforeach
                        </x-nq::select.content>
                    </x-nq::select>
                </div>
                <nav aria-label="{{ $t['nav'] }}" class="hidden flex-col gap-4 md:flex">
                    @foreach ($groups as $group)
                        <div role="group" aria-labelledby="{{ $uid }}-{{ $group['id'] }}" class="flex flex-col gap-0.5">
                            <div id="{{ $uid }}-{{ $group['id'] }}" class="px-3 pb-1 text-caption font-medium text-muted-foreground">{{ $group['label'] }}</div>
                            @foreach ($group['pages'] as $page)
                                @php $current = $page['id'] === ($active['id'] ?? null); @endphp
                                <button type="button" x-bind="nav(@js($page['id']))" data-active="{{ $current ? 'true' : 'false' }}"
                                    @if ($current) aria-current="page" @endif
                                    @if (! empty($page['description'])) title="{{ $page['description'] }}" @endif
                                    class="{{ \Nasaq\Cn::merge($navItem, ($page['tone'] ?? null) === 'danger' ? 'text-nq-danger-text hover:text-nq-danger-text data-[active=true]:text-nq-danger-text' : '') }}">
                                    @if (! empty($page['icon']))<x-dynamic-component :component="'lucide-'.$page['icon']" aria-hidden="true" />@endif
                                    <span class="min-w-0 flex-1 truncate">{{ $page['label'] }}</span>
                                </button>
                            @endforeach
                        </div>
                    @endforeach
                </nav>
            </div>
        </div>

        <div data-slot="settings-sections-content" class="flex min-w-0 flex-col gap-6">
            {{ $slot }}

            <div data-slot="settings-save-bar" :data-state="status" :hidden="!barShown" @if ($count === 0) x-cloak @endif
                class="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-floating border bg-card px-4 py-3 shadow-floating"
                :class="status === 'error' ? 'border-nq-danger/50' : 'border-border'">
                <div role="status" aria-live="polite" class="flex min-w-0 flex-1 items-center gap-2 text-body-sm">
                    <x-lucide-check x-show="status === 'saved'" x-cloak aria-hidden="true" class="size-4 shrink-0 text-nq-success-text" />
                    <x-lucide-circle-alert x-show="status === 'error'" x-cloak aria-hidden="true" class="size-4 shrink-0 text-nq-danger-text" />
                    <span x-show="status === 'idle'" aria-hidden="true" class="size-2 shrink-0 rounded-full bg-nq-accent"></span>
                    <span x-text="message"
                        :class="status === 'error' ? 'text-nq-danger-text' : status === 'saving' ? 'text-muted-foreground' : 'text-foreground'">{{ $dirtyText }}</span>
                </div>
                <div x-show="status !== 'saved'" class="flex items-center gap-2">
                    <x-nq::button variant="ghost" x-on:click="discard()" x-bind:disabled="status === 'saving'" x-bind:data-disabled="status === 'saving' ? '' : null">{{ $t['discard'] }}</x-nq::button>
                    <x-nq::button variant="primary" x-on:click="save()" x-bind:disabled="status === 'saving'" x-bind:data-disabled="status === 'saving' ? '' : null"
                        x-bind:aria-busy="status === 'saving' ? 'true' : null">
                        <template x-if="status === 'saving'"><x-nq::spinner /></template>
                        {{ $t['save'] }}
                    </x-nq::button>
                </div>
            </div>
        </div>
    </div>
</div>

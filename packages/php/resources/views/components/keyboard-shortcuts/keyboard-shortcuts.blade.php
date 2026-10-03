{{-- <x-nq::keyboard-shortcuts :groups="$groups" />   (also <x-nq::keyboard-shortcuts.reference>)
     A searchable reference of an app's keyboard shortcuts, grouped, drawn for the reader's keyboard (Command on a Mac, Ctrl elsewhere)
     with a Mac/Windows switch. groups: [['id' => 'nav', 'title' => 'Navigation', 'titleAr' => 'التنقل', 'items' => [
         ['id' => 'palette', 'label' => 'Open the command palette', 'labelAr' => 'فتح لوحة الأوامر', 'keys' => 'Mod+K'],   keys: a string or a list of alternatives; optional apple keys, description, descriptionAr
     ]]]. Write Mod+K, not Ctrl+K, so a Mac sees Command.
     platform: auto (this device, default) | mac | windows. show-platform-switch / searchable (default true). title: a heading (default localised; :title="false" hides it). description.
     locale: default the app locale. labels: override any string (title, description, search, empty, emptyHint, platform, auto, mac, windows, then, or, results with {n}, resultsOne).
     Search folds Arabic letter variants. Fires nq-platform-change on the root. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['groups' => [], 'platform' => 'auto', 'showPlatformSwitch' => true, 'searchable' => true, 'title' => null, 'description' => null, 'locale' => null, 'labels' => []])
@php
    $locale ??= app()->getLocale();
    $ar = \Nasaq\Nasaq::rtl($locale);
    $en = ['title' => 'Keyboard shortcuts', 'search' => 'Search shortcuts', 'empty' => 'No shortcut matches', 'emptyHint' => 'Try another word, or clear the search.', 'platform' => 'Show keys for', 'auto' => 'This device', 'mac' => 'Mac', 'windows' => 'Windows', 'then' => 'then', 'or' => 'or', 'results' => '{n} shortcuts', 'resultsOne' => '1 shortcut'];
    $arStrings = ['title' => 'اختصارات لوحة المفاتيح', 'search' => 'ابحث في الاختصارات', 'empty' => 'لا يوجد اختصار مطابق', 'emptyHint' => 'جرّب كلمة أخرى أو امسح البحث.', 'platform' => 'عرض المفاتيح لـ', 'auto' => 'هذا الجهاز', 'mac' => 'ماك', 'windows' => 'ويندوز', 'then' => 'ثم', 'or' => 'أو', 'results' => '{n} اختصارًا', 'resultsOne' => 'اختصار واحد'];
    $t = array_merge($ar ? $arStrings : $en, (array) $labels);
    $pick = fn ($e, $a) => $ar ? ($a ?: $e) : ($e ?: $a);
    $asList = fn ($keys) => $keys === null ? [] : (array) $keys;
    $heading = $title === null ? $t['title'] : ($title === false ? null : $title);
    $total = 0;
    foreach ($groups as $g) {
        $total += count($g['items'] ?? []);
    }
    $count = number_format($total);
    $status = $total === 1 ? $t['resultsOne'] : str_replace('{n}', $count, $t['results']);
    $first = $platform === 'mac' ? 'mac' : 'other';
@endphp
<section data-slot="shortcuts-reference" x-data="nqShortcuts(@js($platform), @js(['results' => $t['results'], 'resultsOne' => $t['resultsOne'], 'locale' => $ar ? 'ar' : 'en']))" x-id="['nq-shortcuts']"
    @if ($heading) :aria-labelledby="$id('nq-shortcuts', 'title')" @endif
    {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($heading || $description)
        <header class="flex flex-col gap-1">
            @if ($heading)
                <h2 :id="$id('nq-shortcuts', 'title')" class="text-title text-foreground">{{ $heading }}</h2>
            @endif
            @if ($description)
                <p class="text-body-sm text-muted-foreground">{{ $description }}</p>
            @endif
        </header>
    @endif

    @if ($searchable || $showPlatformSwitch)
        <div class="flex flex-wrap items-center gap-3">
            @if ($searchable)
                <div class="relative min-w-48 flex-1">
                    <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
                    <x-nq::field.input type="search" x-model="query" placeholder="{{ $t['search'] }}" aria-label="{{ $t['search'] }}" class="ps-9" />
                </div>
            @endif
            @if ($showPlatformSwitch)
                <x-nq::toggle-group :default-value="[$platform]" x-model="platformValue" aria-label="{{ $t['platform'] }}">
                    <x-nq::toggle-group.toggle value="auto">{{ $t['auto'] }}</x-nq::toggle-group.toggle>
                    <x-nq::toggle-group.toggle value="mac">{{ $t['mac'] }}</x-nq::toggle-group.toggle>
                    <x-nq::toggle-group.toggle value="windows">{{ $t['windows'] }}</x-nq::toggle-group.toggle>
                </x-nq::toggle-group>
            @endif
        </div>
    @endif

    <span role="status" aria-live="polite" class="sr-only" x-text="status()">{{ $status }}</span>

    <x-nq::states icon="keyboard" :title="$t['empty']" :description="$t['emptyHint']" x-show="total() === 0" style="display: none;" />
    <div class="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2" x-show="total() > 0">
        @foreach ($groups as $group)
            @php
                $groupTitle = $pick($group['title'] ?? '', $group['titleAr'] ?? '');
            @endphp
            <div data-group="{{ $group['id'] }}" data-title="{{ $groupTitle }}" role="group" :aria-labelledby="$id('nq-shortcuts', 'g-{{ $group['id'] }}')" class="flex min-w-0 flex-col" x-show="groupVisible($el)">
                <h3 :id="$id('nq-shortcuts', 'g-{{ $group['id'] }}')" class="pb-2 text-label text-foreground">{{ $groupTitle }}</h3>
                <ul role="list" class="flex flex-col divide-y divide-border border-y border-border">
                    @foreach ($group['items'] ?? [] as $item)
                        @php
                            $itemDescription = $pick($item['description'] ?? '', $item['descriptionAr'] ?? '');
                            $windowsKeys = $asList($item['keys'] ?? null);
                            $macKeys = isset($item['apple']) ? $asList($item['apple']) : $windowsKeys;
                        @endphp
                        <li data-item="{{ $item['id'] }}" data-search="{{ $pick($item['label'] ?? '', $item['labelAr'] ?? '') }} {{ $itemDescription }}"
                            data-keys-mac="{{ implode(' ', $macKeys) }}" data-keys-other="{{ implode(' ', $windowsKeys) }}" x-show="itemVisible($el)"
                            class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
                            <div class="flex min-w-0 flex-1 basis-40 flex-col">
                                <span class="text-body text-foreground">{{ $pick($item['label'] ?? '', $item['labelAr'] ?? '') }}</span>
                                @if ($itemDescription)
                                    <span class="text-caption text-muted-foreground">{{ $itemDescription }}</span>
                                @endif
                            </div>
                            @foreach (['other' => $windowsKeys, 'mac' => $macKeys] as $which => $list)
                                <div data-keys="{{ $which }}" class="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1"
                                    x-show="{{ $which === 'mac' ? 'apple' : '! apple' }}" @if ($which !== $first) style="display: none;" @endif>
                                    @foreach ($list as $i => $s)
                                        @if ($i > 0)<span class="text-caption text-muted-foreground">{{ $t['or'] }}</span>@endif
                                        <x-nq::keyboard-shortcuts.keys :shortcut="$s" :platform="$which === 'mac' ? 'mac' : 'windows'" :then-label="$t['then']" />
                                    @endforeach
                                </div>
                            @endforeach
                        </li>
                    @endforeach
                </ul>
            </div>
        @endforeach
    </div>
</section>

{{-- <x-nq::hotkey-recorder.bindings :bindings="[['id' => 'palette', 'label' => 'Command palette', 'labelAr' => 'لوحة الأوامر', 'group' => 'General', 'groupAr' => 'عام', 'shortcut' => 'Mod+K', 'defaultShortcut' => 'Mod+K']]" title="Keyboard shortcuts" />
     A settings list of shortcuts, one recorder per action, with clash warnings across the whole list and Reset all. Presentational: it reports each change and you store it.
     bindings: rows of id, label (labelAr), description (descriptionAr), group (groupAr), shortcut (or null), defaultShortcut (what Reset goes back to), locked (shown, not editable).
     on-change: a JS function (id, shortcut) => ...; return or resolve { error: "message" } (or throw) to keep the old shortcut. A change also bubbles "nq-hotkeys-change" ({ id, shortcut }).
     sequence, require-modifier (default true), platform, title (omit to hide). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['bindings' => [], 'onChange' => null, 'sequence' => false, 'requireModifier' => true, 'platform' => 'auto', 'title' => null])
@php
    $isAr = \Nasaq\Nasaq::rtl();
    $pick = fn (array $row, string $key) => ($isAr ? ($row[$key.'Ar'] ?? null) : null) ?: ($row[$key] ?? null) ?: ($row[$key.'Ar'] ?? null) ?: '';
    $rows = collect($bindings)->map(fn ($b) => [
        'id' => $b['id'],
        'label' => $pick($b, 'label'),
        'description' => $pick($b, 'description'),
        'group' => $pick($b, 'group'),
        'shortcut' => $b['shortcut'] ?? null,
        'hasDefault' => array_key_exists('defaultShortcut', $b),
        'defaultShortcut' => $b['defaultShortcut'] ?? null,
        'locked' => (bool) ($b['locked'] ?? false),
    ]);
    $items = $rows->map(fn ($r) => [
        'id' => $r['id'],
        'label' => $r['label'],
        'shortcut' => $r['shortcut'],
        'locked' => $r['locked'],
    ] + ($r['hasDefault'] ? ['defaultShortcut' => $r['defaultShortcut']] : []))->values()->all();
    $groups = $rows->groupBy(fn ($r) => $r['group'])->all();
    $resetAll = \Nasaq\Nasaq::t('Reset all', 'إعادة الكل');
    $strings = ['invalid' => \Nasaq\Nasaq::t('That is not a usable shortcut.', 'هذا اختصار غير صالح.')];
    $optionsJs = \Illuminate\Support\Js::from((object) ['strings' => $strings])->toHtml();
    if ($onChange) {
        $optionsJs = 'Object.assign('.$optionsJs.', { onChange: ('.$onChange.') })';
    }
    $uid = 'nq-hk-'.substr(md5(json_encode($items)), 0, 6);
@endphp
<div data-slot="hotkey-bindings" x-data="nqHotkeyBindings(@js($items), {!! $optionsJs !!})"
    {{ $attributes->cn('flex min-w-0 flex-col gap-5') }}>
    <div @if (! $title) x-show="differing().length > 0" x-cloak style="display: none" @endif class="flex flex-wrap items-center justify-between gap-2">
        @if ($title)<h2 class="text-title text-foreground">{{ $title }}</h2>@else<span></span>@endif
        <x-nq::button type="button" variant="ghost" size="sm" x-show="differing().length > 0" x-cloak style="display: none" @click="resetAll()">
            <x-lucide-rotate-ccw aria-hidden="true" />
            {{ $resetAll }}
        </x-nq::button>
    </div>
    <p x-show="failure" x-cloak style="display: none" role="alert" class="text-body-sm text-nq-danger-text" x-text="failure"></p>
    @foreach ($groups as $key => $group)
        <section @if ($key !== '') aria-labelledby="{{ $uid }}-{{ $loop->index }}" @endif class="flex flex-col">
            @if ($key !== '')<h3 id="{{ $uid }}-{{ $loop->index }}" class="pb-2 text-label text-foreground">{{ $key }}</h3>@endif
            <ul role="list" class="flex flex-col divide-y divide-border border-y border-border">
                @foreach ($group as $row)
                    <li data-binding="{{ $row['id'] }}" class="grid grid-cols-1 items-start gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                        <div class="flex min-w-0 flex-col">
                            <span class="text-body text-foreground">{{ $row['label'] }}</span>
                            @if ($row['description'])<span class="text-caption text-muted-foreground">{{ $row['description'] }}</span>@endif
                        </div>
                        <x-nq::hotkey-recorder :value="$row['shortcut']" :sequence="$sequence" :require-modifier="$requireModifier" :platform="$platform"
                            :binding-id="$row['id']" :reset-to="$row['hasDefault'] ? ($row['defaultShortcut'] ?? '') : null" :disabled="$row['locked']" :label="$row['label']"
                            bindings-js="others()" :x-model="'current[`'.addslashes($row['id']).'`]'" :x-on:nq-hotkey-change="'onRow(`'.addslashes($row['id']).'`, $event)'" />
                    </li>
                @endforeach
            </ul>
        </section>
    @endforeach
</div>

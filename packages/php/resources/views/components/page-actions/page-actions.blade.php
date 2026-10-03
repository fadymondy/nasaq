{{-- <x-nq::page-actions :primary="['label'=>'New issue','icon'=>'plus','shortcut'=>'C','event'=>'issue-new']" :actions="[['label'=>'Export CSV','icon'=>'download','event'=>'export'],['label'=>'Delete','icon'=>'trash-2','danger'=>true,'group'=>'danger','event'=>'delete']]" />
     The header's action area: one visible primary action and the rest behind a "More actions" menu. The default slot holds other always-visible controls.
     An action: label, icon (lucide name), href (navigates) or event (a browser event dispatched on click, listen with x-on:NAME.window), shortcut (shown, "Mod Shift D"), disabled, danger, group (a separator between groups).
     The command palette registration and global shortcut binding of the React component are not ported: shortcuts are shown, not bound. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['primary' => null, 'actions' => [], 'moreLabel' => null])
@php
    $more = $moreLabel ?? \Nasaq\Nasaq::t('More actions', 'إجراءات أخرى');
    $keys = fn (?string $shortcut) => array_map(
        fn ($k) => ['mod' => 'Ctrl', 'cmd' => 'Ctrl', 'meta' => 'Ctrl', 'control' => 'Ctrl', 'ctrl' => 'Ctrl', 'alt' => 'Alt', 'option' => 'Alt', 'shift' => 'Shift'][strtolower($k)] ?? (strlen($k) === 1 ? strtoupper($k) : $k),
        preg_split('/\s+/', trim((string) $shortcut), -1, PREG_SPLIT_NO_EMPTY),
    );
    $groups = [];
    foreach ((array) $actions as $a) { $groups[$a['group'] ?? ''][] = $a; }
    $groups = array_values($groups);
    $click = fn ($a) => ! empty($a['href']) ? 'window.location.assign(`'.str_replace(['`', '${', chr(92)], '', $a['href']).'`)' : (! empty($a['event']) ? '$dispatch(`'.preg_replace('/[^A-Za-z0-9:._-]/', '', $a['event']).'`)' : null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'page-actions') }}" {{ $attributes->except('data-slot')->cn('flex items-center gap-1.5') }}>
    {{ $slot }}
    @if (count((array) $actions))
        <x-nq::dropdown-menu>
            <x-nq::tooltip :content="$more">
                <x-nq::dropdown-menu.trigger variant="ghost" size="icon-sm" :aria-label="$more" class="text-muted-foreground"><x-nq::icon name="ellipsis" /></x-nq::dropdown-menu.trigger>
            </x-nq::tooltip>
            <x-nq::dropdown-menu.content align="end" class="min-w-52">
                @foreach ($groups as $i => $items)
                    @if ($i > 0)<x-nq::dropdown-menu.separator />@endif
                    <x-nq::dropdown-menu.group>
                        @foreach ($items as $a)
                            <x-nq::dropdown-menu.item :variant="! empty($a['danger']) ? 'danger' : 'default'" :disabled="! empty($a['disabled'])" :x-on:click="$click($a)">
                                @if (! empty($a['icon']))<x-nq::icon :name="$a['icon']" />@endif
                                <span class="min-w-0 flex-1 truncate">{{ $a['label'] }}</span>
                                @if (! empty($a['shortcut']))
                                    <span dir="ltr" class="ms-auto flex gap-1 [&_kbd]:h-4.5 [&_kbd]:min-w-4.5">@foreach ($keys($a['shortcut']) as $k)<x-nq::text.kbd>{{ $k }}</x-nq::text.kbd>@endforeach</span>
                                @endif
                            </x-nq::dropdown-menu.item>
                        @endforeach
                    </x-nq::dropdown-menu.group>
                @endforeach
            </x-nq::dropdown-menu.content>
        </x-nq::dropdown-menu>
    @endif
    @if ($primary)
        @php
            $p = $primary;
            $variant = ! empty($p['danger']) ? 'danger' : 'primary';
        @endphp
        @if (! empty($p['shortcut']))
            <x-nq::tooltip>
                <x-slot:tip>
                    <span class="flex items-center gap-2">{{ $p['label'] }}<span dir="ltr" class="flex gap-1">@foreach ($keys($p['shortcut']) as $k)<x-nq::text.kbd>{{ $k }}</x-nq::text.kbd>@endforeach</span></span>
                </x-slot:tip>
                <x-nq::button :variant="$variant" size="sm" :href="$p['href'] ?? null" :disabled="! empty($p['disabled'])" :aria-label="! empty($p['icon']) ? $p['label'] : null"
                    :aria-keyshortcuts="implode('+', $keys($p['shortcut']))" :x-on:click="$click($p)">
                    @if (! empty($p['icon']))<x-nq::icon :name="$p['icon']" />@endif
                    <span @class(['hidden sm:inline' => ! empty($p['icon'])])>{{ $p['label'] }}</span>
                </x-nq::button>
            </x-nq::tooltip>
        @else
            <x-nq::button :variant="$variant" size="sm" :href="$p['href'] ?? null" :disabled="! empty($p['disabled'])" :aria-label="! empty($p['icon']) ? $p['label'] : null" :x-on:click="$click($p)">
                @if (! empty($p['icon']))<x-nq::icon :name="$p['icon']" />@endif
                <span @class(['hidden sm:inline' => ! empty($p['icon'])])>{{ $p['label'] }}</span>
            </x-nq::button>
        @endif
    @endif
</div>

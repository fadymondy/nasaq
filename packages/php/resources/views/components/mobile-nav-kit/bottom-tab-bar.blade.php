{{-- <x-nq::mobile-nav-kit.bottom-tab-bar :items="[['value' => 'home', 'label' => 'Home', 'icon' => 'house'], ['value' => 'inbox', 'label' => 'Inbox', 'icon' => 'inbox', 'badge' => 3]]" value="home" />
     A bottom tab bar for phones: 3 to 5 destinations, an icon over a label, a badge, and room for the home indicator.
     items: value, label, icon (a lucide name), badge (a count or short text; 0 and empty hide it), href (renders a link instead of a button).
     value: the active tab (x-modelable: x-model="$wire.tab"); fires a bubbling "nq-change" { value }. position: sticky (default) | fixed | static.
     Arrow keys (mirrored in RTL) and Home/End move focus. labels: ['navigation']. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['items' => [], 'value' => null, 'position' => 'sticky', 'labels' => []])
@php
    $js = fn ($v) => (string) \Illuminate\Support\Js::from($v);
    $items = array_values($items);
    $label = $labels['navigation'] ?? \Nasaq\Nasaq::t('Main navigation', 'التنقل الرئيسي');
    $tab = 'relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-control px-2 py-1.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground data-active:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
    $hasBadge = fn ($i) => isset($i['badge']) && $i['badge'] !== 0 && $i['badge'] !== '' && $i['badge'] !== '0';
@endphp
<nav data-slot="{{ $attributes->get('data-slot', 'bottom-tab-bar') }}" aria-label="{{ $label }}" x-data="nqBottomTabBar({!! $js($value) !!}, {!! $js(array_column($items, 'value')) !!})" x-modelable="value"
    {{ $attributes->except('data-slot')->cn([
        'z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-foreground',
        'sticky bottom-0' => $position === 'sticky',
        'fixed inset-x-0 bottom-0' => $position === 'fixed',
    ]) }}>
    <ul class="flex items-stretch justify-around px-1">
        @foreach ($items as $i => $item)
            @php
                $v = $js($item['value']);
                $bind = 'x-bind:data-active="value === '.$v.' ? \'\' : null" x-bind:aria-current="value === '.$v.' ? \'page\' : null" x-bind:tabindex="stop('.$v.', '.$i.')"';
            @endphp
            <li class="min-w-0 flex-1">
                @if (! empty($item['href']))
                    <a data-tab-item href="{{ $item['href'] }}" {!! $bind !!} x-on:keydown="onKey($event, {{ $i }})" x-on:click="pick({!! $v !!})" class="{{ $tab }}">
                @else
                    <button data-tab-item type="button" {!! $bind !!} x-on:keydown="onKey($event, {{ $i }})" x-on:click="pick({!! $v !!})" class="{{ $tab }}">
                @endif
                    <span class="relative">
                        <x-dynamic-component :component="'lucide-'.($item['icon'] ?? 'circle')" aria-hidden="true" class="size-5" />
                        @if ($hasBadge($item))
                            <span data-slot="bottom-tab-badge" class="absolute -top-1.5 -end-2.5 grid min-w-4 place-items-center rounded-full bg-nq-danger px-1 text-[10px] leading-4 font-medium text-background">{{ $item['badge'] }}</span>
                        @endif
                    </span>
                    <span class="max-w-full truncate">{{ $item['label'] }}</span>
                @if (! empty($item['href']))
                    </a>
                @else
                    </button>
                @endif
            </li>
        @endforeach
    </ul>
</nav>

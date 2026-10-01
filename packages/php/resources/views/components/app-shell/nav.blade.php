{{-- <x-nq::app-shell.nav> <x-nq::app-shell.nav-item href="/" :active="true">Overview</x-nq::app-shell.nav-item> ... </x-nq::app-shell.nav>
     Section tabs under the header, for apps without a sidebar. Below md they move to a bottom bar (thumb reach): the first mobile-items sit on it and the rest open in a drawer behind "More" (needs Alpine).
     mobile-items: how many fit on the bar (default 4; with exactly one extra item it is shown instead of "More"). more-label: the overflow button (More / المزيد).
     icons: always (default) | mobile: text-only tabs on desktop, icons only on the phone bar and its drawer. Children must be app-shell.nav-item. --}}
@props(['mobileItems' => 4, 'moreLabel' => null, 'icons' => 'always'])
@php
    preg_match_all('/<!--nq-nav-->(.*?)<!--nq-nav-end-->/s', (string) $slot, $found);
    $items = array_map(fn ($chunk) => array_pad(explode('<!--nq-nav-split-->', $chunk), 3, ''), $found[1]);
    $fits = count($items) <= $mobileItems + 1;
    $onBar = $fits ? $items : array_slice($items, 0, $mobileItems);
    $overflow = $fits ? [] : array_slice($items, $mobileItems);
    $overflowActive = collect($overflow)->contains(fn ($item) => str_contains($item[2], 'aria-current="page"'));
    $more = $moreLabel ?? \Nasaq\Nasaq::t('More', 'المزيد');
    $label = $attributes->get('aria-label') ?: \Nasaq\Nasaq::t('Sections', 'الأقسام');
    $barItem = 'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
@endphp
<nav data-slot="app-nav" aria-label="{{ $label }}" {{ $attributes->except('aria-label')->cn(['shrink-0 border-b border-border bg-background max-md:hidden', '[&_[data-slot=app-nav-icon]]:hidden' => $icons === 'mobile']) }}>
    <div class="flex items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none]">{!! implode('', array_column($items, 0)) !!}</div>
</nav>
<nav data-slot="app-nav-bar" aria-label="{{ $label }}" class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
    <div class="flex items-stretch px-1">
        {!! implode('', array_column($onBar, 1)) !!}
        @if (count($overflow))
            <x-nq::drawer>
                <button type="button" data-slot="app-nav-more" aria-haspopup="dialog" x-on:click="show()" x-bind:aria-expanded="open" @if ($overflowActive) data-active @endif
                    class="{{ $barItem }} {{ $overflowActive ? 'font-medium text-foreground' : '' }}">
                    <x-lucide-ellipsis aria-hidden="true" />
                    <span class="max-w-full truncate">{{ $more }}</span>
                </button>
                <x-nq::drawer.content>
                    <x-nq::drawer.header><x-nq::drawer.title>{{ $more }}</x-nq::drawer.title></x-nq::drawer.header>
                    <x-nq::drawer.body>
                        <div class="grid gap-0.5 pb-2" x-on:click="if ($event.target.closest('a')) close()">{!! implode('', array_column($overflow, 2)) !!}</div>
                    </x-nq::drawer.body>
                </x-nq::drawer.content>
            </x-nq::drawer>
        @endif
    </div>
</nav>

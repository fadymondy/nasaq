{{-- <x-nq::product-switcher :products="[['id' => 'mahaam', 'brand' => 'mahaam', 'name' => 'Mahaam', 'href' => 'https://mahaam.app']]" current="mahaam" all-href="/apps" />
     The app launcher (a grid of apps in a popover). Each product shows its official mark, never recoloured; its accent only marks the current one.
     products: id, name (already localised), brand (a Nasaq brand key), logo-src or logo (the host's own official logo: an image URL or trusted HTML), accent (a colour, when the brand is not a Nasaq one),
     description (the tile's title), href (a link; without it the tile is a button), badge (an unread count), pinned (see sidebar-products). current: the id of the product the user is in.
     all-href: adds an "All apps" footer link. labels: ['trigger' => , 'heading' => , 'all' => ]. The default slot replaces the trigger's grid icon.
     Events (bubbling, from the root): "nq-select" { id } when a tile is chosen (also for links, so you can track it), "nq-view-all" for the footer button when there is no all-href (set view-all).
     Arrow keys, Home and End move through the grid (mirrored in RTL). Not ported: the "Switch to..." commands in the command palette (there is no commands registry in Blade) and the trigger's tooltip (it carries a title instead).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['products' => [], 'current' => null, 'allHref' => null, 'viewAll' => false, 'labels' => []])
@php
    $accents = ['nasaq' => '#C9A227', 'fadymondy' => '#C9A227', 'mahaam' => '#C9A227', 'zekra' => '#C9A227', 'moharrik' => '#C9A227', 'seatfor' => '#C9A227', 'health-debug' => '#C9A227', 'circlexo' => '#C9A227', 'hosbah' => '#C9A227', 'orchestra' => '#8C3B1F', 'togo' => '#1F8A99'];
    $trigger = $labels['trigger'] ?? \Nasaq\Nasaq::t('Apps', 'التطبيقات');
    $heading = $labels['heading'] ?? $trigger;
    $all = $labels['all'] ?? \Nasaq\Nasaq::t('All apps', 'كل التطبيقات');
    $pick = '$refs.trigger.dispatchEvent(new CustomEvent(`nq-select`, { bubbles: true, detail: { id: $el.dataset.id } })); close()';
    $viewAllClick = '$refs.trigger.dispatchEvent(new CustomEvent(`nq-view-all`, { bubbles: true })); close()';
@endphp
<x-nq::popover>
    <button type="button" data-slot="{{ $attributes->get('data-slot', 'product-switcher-trigger') }}" x-ref="trigger" aria-haspopup="dialog" x-on:click="toggle()" x-bind:aria-expanded="open" x-bind:data-popup-open="open ? '' : null"
        aria-label="{{ $trigger }}" title="{{ $trigger }}"
        {{ $attributes->except('data-slot')->cn([
            'inline-flex size-control-sm items-center justify-center rounded-control text-muted-foreground outline-none',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground data-popup-open:bg-nq-selected data-popup-open:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4',
        ]) }}>{{ $slot->isEmpty() ? '' : $slot }}@if ($slot->isEmpty())<x-lucide-layout-grid aria-hidden="true" />@endif</button>
    <x-nq::popover.content side="bottom" align="end" :side-offset="6" data-slot="product-switcher" class="w-[19rem] p-1.5 text-body">
        <div class="px-2 pt-1.5 pb-2 text-caption font-medium text-muted-foreground">{{ $heading }}</div>
        <div role="group" x-data="nqProductGrid" x-on:keydown="onKey($event)" class="grid grid-cols-3 gap-1">
            @foreach ($products as $p)
                @php
                    $accent = $p['accent'] ?? (isset($p['brand']) ? ($accents[$p['brand']] ?? null) : null) ?? 'var(--nq-accent)';
                    $isCurrent = $current !== null && $p['id'] === $current;
                @endphp
                <{{ ! empty($p['href']) ? 'a' : 'button' }} data-slot="product-tile" data-id="{{ $p['id'] }}"
                    @if (! empty($p['href'])) href="{{ $p['href'] }}" @else type="button" @endif
                    @if ($isCurrent) aria-current="page" @endif
                    @if (! empty($p['description'])) title="{{ $p['description'] }}" @endif
                    style="--product-accent: {{ $accent }}" x-on:click="{{ $pick }}"
                    class="group relative flex flex-col items-center gap-1.5 rounded-control px-1 pt-3 pb-2 text-center outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus aria-[current]:bg-nq-selected">
                    <span class="relative inline-flex size-10 items-center justify-center rounded-control border border-border bg-card">
                        <x-nq::product-switcher.product-icon :product="$p" :size="24" />
                        @if (! empty($p['badge']))
                            <span class="absolute -end-1.5 -top-1.5 min-w-4 rounded-full bg-nq-danger-solid px-1 text-center text-[10px] leading-4 font-medium text-nq-on-danger tabular-nums">{{ $p['badge'] }}</span>
                        @endif
                    </span>
                    <span class="w-full truncate text-caption text-foreground">{{ $p['name'] }}</span>
                    <span aria-hidden="true" class="absolute inset-x-5 bottom-0.5 h-0.5 rounded-full bg-(--product-accent) opacity-0 group-aria-[current]:opacity-100"></span>
                </{{ ! empty($p['href']) ? 'a' : 'button' }}>
            @endforeach
        </div>
        @if ($allHref || $viewAll)
            <{{ $allHref ? 'a' : 'button' }} @if ($allHref) href="{{ $allHref }}" @else type="button" @endif data-slot="product-all" x-on:click="{{ $viewAllClick }}"
                class="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-control border-t border-border text-body-sm text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                {{ $all }}
                <x-lucide-arrow-up-right aria-hidden="true" class="size-3.5 rtl:-scale-x-100" />
            </{{ $allHref ? 'a' : 'button' }}>
        @endif
    </x-nq::popover.content>
</x-nq::popover>

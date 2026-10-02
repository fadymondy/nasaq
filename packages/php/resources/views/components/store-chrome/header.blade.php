{{-- <x-nq::store-chrome.header :nav="$nav" :search="['products' => $products, 'currency' => 'USD']" :cart-count="2" cart-button> <x-slot:brand>Nasaq Goods</x-slot:brand> </x-nq::store-chrome.header>
     The storefront header: announcement slot, brand, mega menu, search, wishlist, account and cart with a count. On phones the menu moves into a sheet with
     an accordion and the search drops to its own row. Needs the Alpine runtime (@nasaqScripts).
     Slots: brand (the logo or store name), announcement (an <x-nq::store-chrome.announcement-bar>), utility (extra controls before the cart: a language or
     currency switch), account (replaces the account button). nav, current-nav-id: as <x-nq::store-chrome.mega-menu>. brand-href (/).
     search: the props of <x-nq::store-chrome.search> as an array; without it the search box is hidden.
     cart-count, wishlist-count: badges (99+ past 99). cart-button: the cart is a button (event nq-store-cart-click); cart-href: a link instead.
     wishlist-button: show the wishlist button (also shown with wishlist-count; event nq-store-wishlist-click). account-button: show the account button
     (event nq-store-account-click). sticky: stick to the top (true). labels: override any string. --}}
@include('nasaq::components.store-chrome._strings')
@props(['brandHref' => '/', 'nav' => [], 'currentNavId' => null, 'search' => null, 'cartCount' => null, 'cartButton' => false, 'cartHref' => null, 'wishlistCount' => null, 'wishlistButton' => false, 'accountButton' => false, 'sticky' => true, 'labels' => []])
@php
    $L = nq_sch_all((array) $labels);
    $nav = array_values(array_map(fn ($i) => (array) $i, (array) $nav));
    $locale = \Nasaq\Nasaq::rtl() ? 'ar' : str_replace('_', '-', app()->getLocale());
    $fmt = fn ($n) => class_exists(\NumberFormatter::class) ? (new \NumberFormatter($locale.'@numbers=latn', \NumberFormatter::DECIMAL))->format($n) : (string) $n;
    $badge = fn ($n) => $n > 99 ? $fmt(99).'+' : $fmt($n);
    $cartLabel = $cartCount ? nq_sch_t('cartWithCount', ['n' => $fmt($cartCount)], (array) $labels) : $L['cart'];
    $wishLabel = $wishlistCount ? nq_sch_t('wishlistWithCount', ['n' => $fmt($wishlistCount)], (array) $labels) : $L['wishlist'];
    $showWish = $wishlistButton || $wishlistCount !== null;
    $showCart = $cartButton || $cartHref;
    $search = $search !== null ? (array) $search : null;
    $badgeClass = 'absolute -end-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums';
@endphp
<header data-slot="{{ $attributes->get('data-slot', 'store-header') }}" x-data {{ $attributes->except('data-slot')->cn([$sticky ? 'sticky top-0 z-40' : '', 'border-b border-border bg-background']) }}>
    {{ $announcement ?? '' }}
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
        @if (count($nav))
            <x-nq::sheet class="lg:hidden">
                <x-nq::sheet.trigger size="icon" variant="ghost" aria-label="{{ $L['menu'] }}" class="lg:hidden"><x-lucide-menu aria-hidden="true" class="size-4" /></x-nq::sheet.trigger>
                <x-nq::sheet.content side="start" :close-label="$L['closeMenu']" class="w-[min(22rem,100vw)]">
                    <x-nq::sheet.header>
                        <x-nq::sheet.title>{{ $L['menu'] }}</x-nq::sheet.title>
                        <x-nq::sheet.description class="sr-only">{{ $L['mobileNavigation'] }}</x-nq::sheet.description>
                    </x-nq::sheet.header>
                    <x-nq::sheet.body>
                        <nav aria-label="{{ $L['mobileNavigation'] }}">
                            <x-nq::accordion class="rounded-none border-0 bg-transparent">
                                @foreach ($nav as $item)
                                    @if (count((array) ($item['columns'] ?? [])))
                                        <x-nq::accordion.item :value="$item['id']">
                                            <x-nq::accordion.trigger>{{ $item['label'] }}</x-nq::accordion.trigger>
                                            <x-nq::accordion.panel>
                                                <div class="flex flex-col gap-3 pb-2">
                                                    @if (! empty($item['href']))<a href="{{ $item['href'] }}" class="text-body-sm font-medium text-foreground underline underline-offset-4">{{ $L['shopAll'] }}</a>@endif
                                                    @foreach ((array) $item['columns'] as $col)
                                                        <div class="flex flex-col gap-1">
                                                            <p class="text-caption font-medium text-muted-foreground">{{ $col['title'] }}</p>
                                                            <ul class="m-0 flex list-none flex-col p-0">
                                                                @foreach ((array) ($col['links'] ?? []) as $l)
                                                                    <li>
                                                                        <a href="{{ $l['href'] }}" class="flex items-center gap-2 rounded-control py-1.5 text-body-sm text-foreground no-underline hover:underline">
                                                                            {{ $l['label'] }}
                                                                            @if (! empty($l['badge']))<x-nq::badge variant="accent">{{ $l['badge'] }}</x-nq::badge>@endif
                                                                        </a>
                                                                    </li>
                                                                @endforeach
                                                            </ul>
                                                        </div>
                                                    @endforeach
                                                </div>
                                            </x-nq::accordion.panel>
                                        </x-nq::accordion.item>
                                    @else
                                        <a href="{{ $item['href'] ?? '#' }}" class="flex h-nav-row items-center border-b border-border px-4 text-label no-underline {{ ! empty($item['highlight']) ? 'text-nq-danger-text' : 'text-foreground' }}">{{ $item['label'] }}</a>
                                    @endif
                                @endforeach
                            </x-nq::accordion>
                        </nav>
                    </x-nq::sheet.body>
                </x-nq::sheet.content>
            </x-nq::sheet>
        @endif
        <a href="{{ $brandHref }}" class="shrink-0 rounded-sm text-h3 font-semibold text-foreground no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ $brand ?? '' }}</a>
        <div class="hidden min-w-0 lg:block">
            <x-nq::store-chrome.mega-menu :items="$nav" :current-id="$currentNavId" :labels="(array) $labels" />
        </div>
        @if ($search !== null)
            <x-nq::store-chrome.search :labels="(array) $labels" class="mx-auto hidden max-w-xl flex-1 md:block" :products="$search['products'] ?? []" :category-tree="$search['categoryTree'] ?? []"
                :currency="$search['currency'] ?? null" :recent="$search['recent'] ?? []" :popular="$search['popular'] ?? []" :query="$search['query'] ?? ''" :product-hrefs="$search['productHrefs'] ?? []" :placeholder="$search['placeholder'] ?? null" />
        @else
            <span class="flex-1"></span>
        @endif
        <div class="ms-auto flex shrink-0 items-center gap-0.5 md:ms-0">
            {{ $utility ?? '' }}
            @if ($showWish)
                <x-nq::button size="icon" variant="ghost" aria-label="{{ $wishLabel }}" class="relative hidden sm:inline-flex" x-on:click="$dispatch('nq-store-wishlist-click')">
                    <x-lucide-heart aria-hidden="true" class="size-4" />
                    @if ($wishlistCount)<span aria-hidden="true" class="{{ $badgeClass }}">{{ $badge($wishlistCount) }}</span>@endif
                </x-nq::button>
            @endif
            @if (isset($account) && ! $account->isEmpty())
                {{ $account }}
            @elseif ($accountButton)
                <x-nq::button size="icon" variant="ghost" aria-label="{{ $L['account'] }}" x-on:click="$dispatch('nq-store-account-click')"><x-lucide-user aria-hidden="true" class="size-4" /></x-nq::button>
            @endif
            @if ($showCart)
                <x-nq::button size="icon" variant="ghost" aria-label="{{ $cartLabel }}" class="relative" :href="$cartButton ? null : $cartHref" x-on:click="$dispatch('nq-store-cart-click')">
                    <x-lucide-shopping-bag aria-hidden="true" class="size-4" />
                    @if ($cartCount)<span aria-hidden="true" class="{{ $badgeClass }}">{{ $badge($cartCount) }}</span>@endif
                </x-nq::button>
            @endif
        </div>
    </div>
    @if ($search !== null)
        <div class="px-3 pb-3 md:hidden">
            <x-nq::store-chrome.search :labels="(array) $labels" :products="$search['products'] ?? []" :category-tree="$search['categoryTree'] ?? []"
                :currency="$search['currency'] ?? null" :recent="$search['recent'] ?? []" :popular="$search['popular'] ?? []" :query="$search['query'] ?? ''" :product-hrefs="$search['productHrefs'] ?? []" :placeholder="$search['placeholder'] ?? null" />
        </div>
    @endif
</header>

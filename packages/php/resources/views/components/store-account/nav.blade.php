{{-- <x-nq::store-account.nav active="orders" :counts="['wishlist' => 3]" :hrefs="['orders' => '/account/orders']" @nq-navigate="go($event.detail.section)" />
     Account section navigation: a vertical list on wide screens and a scrolling row on narrow ones.
     active: orders | returns | wishlist | addresses | recent. counts: small numbers next to a section. sections: which to list, in order (default all five).
     hrefs: optional links per section; without one the item is a button. Every click dispatches a bubbling "nq-navigate" { section }. labels: override strings by key. --}}
@include('nasaq::components.store-account._strings')
@props(['active' => 'orders', 'counts' => [], 'sections' => ['orders', 'returns', 'wishlist', 'addresses', 'recent'], 'hrefs' => [], 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $names = ['orders' => $t['navOrders'], 'returns' => $t['navReturns'], 'wishlist' => $t['navWishlist'], 'addresses' => $t['navAddresses'], 'recent' => $t['navRecent']];
    $icons = ['orders' => 'package', 'returns' => 'undo-2', 'wishlist' => 'heart', 'addresses' => 'map-pin', 'recent' => 'clock'];
    $item = 'flex w-full items-center gap-2 rounded-control px-3 py-2 text-start text-body-sm font-medium outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus';
    $nf = new \NumberFormatter(\Nasaq\Nasaq::rtl() ? 'ar-u-nu-latn' : 'en', \NumberFormatter::DECIMAL);
@endphp
<nav data-slot="{{ $attributes->get('data-slot', 'store-account-nav') }}" aria-label="{{ $t['account'] }}" x-data="{}" {{ $attributes->except('data-slot')->cn('min-w-0') }}>
    <ul class="m-0 flex list-none gap-1 overflow-x-auto p-0 pb-1 md:flex-col md:overflow-visible md:pb-0">
        @foreach ($sections as $section)
            @php($on = $section === $active)
            @php($cls = \Nasaq\Cn::merge($item, $on ? 'bg-nq-selected text-foreground' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground'))
            <li class="shrink-0">
                @if (! empty($hrefs[$section]))
                    <a href="{{ $hrefs[$section] }}" data-section="{{ $section }}" @if ($on) aria-current="page" @endif class="{{ $cls }}"
                        x-on:click="$el.dispatchEvent(new CustomEvent('nq-navigate', { bubbles: true, detail: { section: $el.dataset.section } }))">
                        <x-dynamic-component :component="'lucide-'.$icons[$section]" aria-hidden="true" class="size-4" />
                        <span class="whitespace-nowrap">{{ $names[$section] }}</span>
                        @if (! empty($counts[$section]))<span class="ms-auto text-caption tabular-nums text-muted-foreground">{{ $nf->format($counts[$section]) }}</span>@endif
                    </a>
                @else
                    <button type="button" data-section="{{ $section }}" @if ($on) aria-current="page" @endif class="{{ $cls }}"
                        x-on:click="$el.dispatchEvent(new CustomEvent('nq-navigate', { bubbles: true, detail: { section: $el.dataset.section } }))">
                        <x-dynamic-component :component="'lucide-'.$icons[$section]" aria-hidden="true" class="size-4" />
                        <span class="whitespace-nowrap">{{ $names[$section] }}</span>
                        @if (! empty($counts[$section]))<span class="ms-auto text-caption tabular-nums text-muted-foreground">{{ $nf->format($counts[$section]) }}</span>@endif
                    </button>
                @endif
            </li>
        @endforeach
    </ul>
</nav>

{{-- <x-nq::store-account title="My account"><x-slot:nav><x-nq::store-account.nav active="orders" /></x-slot:nav> ...a section... </x-nq::store-account>
     The two-column account layout: navigation beside the content, stacked on narrow screens. Parts: store-account.nav, .order-history, .order, .return-request,
     .return-status, .wishlist, .address-book, .recently-viewed. title: the page heading. Slots: nav, default content. --}}
@props(['title' => null])
<div data-slot="{{ $attributes->get('data-slot', 'store-account-layout') }}" {{ $attributes->except('data-slot')->cn('mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 md:grid-cols-[14rem_minmax(0,1fr)]') }}>
    @if ($title)
        <h1 class="m-0 text-h2 font-semibold md:col-span-2">{{ $title }}</h1>
    @endif
    <aside class="min-w-0">{{ $nav ?? '' }}</aside>
    <main class="min-w-0">{{ $slot }}</main>
</div>

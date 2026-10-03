{{-- Internal: what "Order again" did (added, reduced for stock, skipped). Lives inside an Alpine scope with `notice`, `noticeView(plan)`, `openCart()` (history and order). --}}
@props(['goToCart' => 'Go to cart'])
<div role="status" data-slot="store-reorder-notice" x-show="notice !== null" style="display: none" class="flex flex-col gap-1 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm">
    <span class="font-medium" x-text="noticeView(notice).title"></span>
    <span x-show="noticeView(notice).reduced !== ''" x-text="noticeView(notice).reduced"></span>
    <span x-show="noticeView(notice).skipped !== ''" x-text="noticeView(notice).skipped"></span>
    <span class="text-muted-foreground" x-show="noticeView(notice).price !== ''" x-text="noticeView(notice).price"></span>
    <x-nq::button type="button" size="sm" variant="secondary" class="mt-1 self-start" x-show="noticeView(notice).cart" x-on:click="openCart()">{{ $goToCart }}</x-nq::button>
</div>

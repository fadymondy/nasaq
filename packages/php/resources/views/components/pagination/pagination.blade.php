{{-- <x-nq::pagination :page-count="24" :page="3" />   <x-nq::pagination.cursor-pager …/>   <x-nq::pagination.load-more />
     Numbered pages with ellipsis, previous/next chevrons (mirrored in RTL) and aria-current="page" on the current page.
     page is the current page (1-based) and is x-modelable (x-model / wire:model). It fires "page-change" with the new page:
     @page-change="load($event.detail)". siblings (1) and boundaries (1) shape the slots; label, previous-label and next-label rename the landmark and buttons.
     The first paint is server-rendered; Alpine takes over and re-renders the numbers as the page changes.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['pageCount', 'page' => 1, 'siblings' => 1, 'boundaries' => 1, 'label' => null, 'previousLabel' => null, 'nextLabel' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $pageCount = max(1, (int) $pageCount);
    $page = min(max((int) $page, 1), $pageCount);
    $range = fn (int $from, int $to) => $to >= $from ? range($from, $to) : [];
    $startPages = $range(1, min($boundaries, $pageCount));
    $endPages = $range(max($pageCount - $boundaries + 1, $boundaries + 1), $pageCount);
    $siblingsStart = max(min($page - $siblings, $pageCount - $boundaries - $siblings * 2 - 1), $boundaries + 2);
    $siblingsEnd = min(max($page + $siblings, $boundaries + $siblings * 2 + 2), $endPages ? $endPages[0] - 2 : $pageCount - 1);
    $before = $siblingsStart > $boundaries + 2 ? ['start-ellipsis'] : ($boundaries + 1 < $pageCount - $boundaries ? [$boundaries + 1] : []);
    $after = $siblingsEnd < $pageCount - $boundaries - 1 ? ['end-ellipsis'] : ($pageCount - $boundaries > $boundaries ? [$pageCount - $boundaries] : []);
    $items = array_merge($startPages, $before, $range($siblingsStart, $siblingsEnd), $after, $endPages);
    $pageButton = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border font-sans text-label transition-colors duration-150 ease-nq min-h-[var(--nq-touch-min,0px)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-foreground hover:bg-nq-hover size-control-sm p-0 tabular-nums';
    $ellipsis = 'flex size-control-sm items-center justify-center text-muted-foreground';
    $more = $t::t('More pages', 'المزيد من الصفحات');
@endphp
<nav data-slot="{{ $attributes->get('data-slot', 'pagination') }}" aria-label="{{ $label ?? $t::t('Pagination', 'ترقيم الصفحات') }}"
    x-data="nqPagination({{ $page }}, {{ $pageCount }}, {{ (int) $siblings }}, {{ (int) $boundaries }})" x-modelable="page"
    {{ $attributes->except('data-slot')->cn('w-fit max-w-full') }}>
    <ul class="flex flex-wrap items-center gap-1">
        <li>
            <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $previousLabel ?? $t::t('Previous', 'السابق') }}" :disabled="$page <= 1"
                x-on:click="go(page - 1)" x-bind:disabled="page <= 1" x-bind:data-disabled="page <= 1 ? '' : undefined">
                <x-nq::icon name="chevron-left" />
            </x-nq::button>
        </li>
        @foreach ($items as $item)
            @if (is_int($item))
                <li data-ssr><button type="button" aria-label="{{ $t::t("Page {$item}", "الصفحة {$item}") }}" @if ($item === $page) aria-current="page" @endif
                    class="{{ $pageButton }} {{ $item === $page ? 'border-primary bg-nq-selected' : 'border-transparent' }}">{{ $item }}</button></li>
            @else
                <li data-ssr data-slot="pagination-ellipsis" class="{{ $ellipsis }}"><span aria-hidden="true">…</span><span class="sr-only">{{ $more }}</span></li>
            @endif
        @endforeach
        <template x-for="item in items()" :key="item">
            <li :data-slot="typeof item === 'number' ? undefined : 'pagination-ellipsis'" :class="typeof item === 'number' ? '' : '{{ $ellipsis }}'">
                <button type="button" x-show="typeof item === 'number'" class="{{ $pageButton }}" :class="item === page ? 'border-primary bg-nq-selected' : 'border-transparent'"
                    :aria-label="pageLabel(item)" :aria-current="item === page ? 'page' : undefined" x-text="num(item)" x-on:click="go(item)"></button>
                <span x-show="typeof item !== 'number'" class="contents"><span aria-hidden="true">…</span><span class="sr-only">{{ $more }}</span></span>
            </li>
        </template>
        <li>
            <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $nextLabel ?? $t::t('Next', 'التالي') }}" :disabled="$page >= $pageCount"
                x-on:click="go(page + 1)" x-bind:disabled="page >= pageCount" x-bind:data-disabled="page >= pageCount ? '' : undefined">
                <x-nq::icon name="chevron-right" />
            </x-nq::button>
        </li>
    </ul>
</nav>

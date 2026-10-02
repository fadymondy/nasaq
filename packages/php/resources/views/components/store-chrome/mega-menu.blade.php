{{-- <x-nq::store-chrome.mega-menu :items="[['id' => 'women', 'label' => 'Women', 'columns' => [['title' => 'Clothing', 'links' => [['label' => 'Tops', 'href' => '/tops', 'badge' => 'New']], 'viewAll' => ['label' => 'View all', 'href' => '/clothing']]], 'featured' => ['title' => 'Spring edit', 'href' => '/spring']], ['id' => 'sale', 'label' => 'Sale', 'href' => '/sale', 'highlight' => true]]" />
     The desktop category navigation. Items with columns open one shared panel of link columns and a featured tile; it opens on hover, focus or Enter,
     and arrow keys move between items. Needs the Alpine runtime (@nasaqScripts).
     items: ['id', 'label', 'href', 'columns' => [['title', 'links' => [['label', 'href', 'badge']], 'viewAll' => ['label', 'href']]],
       'featured' => ['title', 'description', 'href', 'image'], 'highlight' => draw the label in the sale colour].
     current-id: id of the current section (aria-current). labels: override any string. --}}
@include('nasaq::components.store-chrome._strings')
@props(['items' => [], 'currentId' => null, 'labels' => []])
@php
    $L = nq_sch_all((array) $labels);
    $items = array_values(array_map(fn ($i) => (array) $i, (array) $items));
    $link = 'inline-flex h-control items-center rounded-control px-3 text-label text-foreground no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-popup-open:bg-nq-hover';
    $colLink = 'flex items-center gap-2 rounded-control px-2 py-1.5 text-body-sm text-foreground no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
    $viewAll = 'mt-1 inline-flex rounded-control px-2 py-1.5 text-body-sm font-medium text-foreground underline underline-offset-4 outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus';
@endphp
<nav aria-label="{{ $L['mainNavigation'] }}" data-slot="{{ $attributes->get('data-slot', 'store-mega-menu') }}" {{ $attributes->except('data-slot')->cn('') }}>
    <x-nq::navigation-menu align="start" :side-offset="6">
        <x-nq::navigation-menu.list>
            @foreach ($items as $item)
                @php
                    $cols = array_values((array) ($item['columns'] ?? []));
                    $tone = ! empty($item['highlight']) ? 'text-nq-danger-text' : '';
                @endphp
                @if (! count($cols) && empty($item['featured']))
                    <x-nq::navigation-menu.item>
                        <x-nq::navigation-menu.link :href="$item['href'] ?? '#'" :active="$currentId !== null && $item['id'] === $currentId" class="{{ $link }} {{ $tone }}">{{ $item['label'] }}</x-nq::navigation-menu.link>
                    </x-nq::navigation-menu.item>
                @else
                    <x-nq::navigation-menu.item :value="$item['id']">
                        <x-nq::navigation-menu.trigger class="{{ $link }} {{ $tone }}">{{ $item['label'] }}</x-nq::navigation-menu.trigger>
                        <x-nq::navigation-menu.content>
                            <div class="flex min-w-[34rem] max-w-[56rem] gap-6 p-5">
                                <div class="grid flex-1 gap-x-8 gap-y-4" style="grid-template-columns: repeat({{ min(max(count($cols), 1), 4) }}, minmax(9rem, 1fr))">
                                    @foreach ($cols as $col)
                                        <div class="flex min-w-0 flex-col gap-1">
                                            <x-nq::navigation-menu.label class="px-0">{{ $col['title'] }}</x-nq::navigation-menu.label>
                                            <ul class="m-0 flex list-none flex-col p-0">
                                                @foreach ((array) ($col['links'] ?? []) as $l)
                                                    <li>
                                                        <x-nq::navigation-menu.link :href="$l['href']" class="{{ $colLink }}">
                                                            {{ $l['label'] }}
                                                            @if (! empty($l['badge']))<x-nq::badge variant="accent">{{ $l['badge'] }}</x-nq::badge>@endif
                                                        </x-nq::navigation-menu.link>
                                                    </li>
                                                @endforeach
                                                @if (! empty($col['viewAll']))
                                                    <li><x-nq::navigation-menu.link :href="$col['viewAll']['href']" class="{{ $viewAll }}">{{ $col['viewAll']['label'] }}</x-nq::navigation-menu.link></li>
                                                @endif
                                            </ul>
                                        </div>
                                    @endforeach
                                </div>
                                @if (! empty($item['featured']))
                                    <x-nq::navigation-menu.featured :href="$item['featured']['href']" class="w-56 shrink-0 justify-start p-0">
                                        <span class="aspect-[4/3] w-full overflow-hidden rounded-t-card bg-secondary"><x-nq::store-listing.product-image :src="$item['featured']['image'] ?? null" alt="" /></span>
                                        <span class="flex flex-col gap-0.5 p-3">
                                            <span class="text-label text-foreground">{{ $item['featured']['title'] }}</span>
                                            @if (! empty($item['featured']['description']))<span class="text-body-sm text-muted-foreground">{{ $item['featured']['description'] }}</span>@endif
                                        </span>
                                    </x-nq::navigation-menu.featured>
                                @endif
                            </div>
                        </x-nq::navigation-menu.content>
                    </x-nq::navigation-menu.item>
                @endif
            @endforeach
        </x-nq::navigation-menu.list>
    </x-nq::navigation-menu>
</nav>

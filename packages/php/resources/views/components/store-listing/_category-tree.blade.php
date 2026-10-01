{{-- Internal: one level of the category tree (recursive). Needs $nodes, $target ('filters' | 'draft'), $depth. Bound to the listing's
     setCategory(), catSel(), catOpen() and count(). --}}
<ul class="flex flex-col gap-0.5 {{ $depth > 0 ? 'ms-3 border-s border-border ps-2' : '' }}">
    @foreach ($nodes as $n)
        <li>
            <button type="button" @if ($n['selected']) aria-current="true" @endif x-bind:aria-current="catSel(@js($target), @js($n['id'])) ? 'true' : undefined"
                x-on:click="setCategory(@js($target), @js($n['id']))"
                x-bind:class="{ 'bg-nq-selected font-medium text-foreground': catSel(@js($target), @js($n['id'])), 'text-muted-foreground': !catSel(@js($target), @js($n['id'])) }"
                class="flex w-full items-center justify-between gap-2 rounded-control px-2 py-1 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus {{ $n['selected'] ? 'bg-nq-selected font-medium text-foreground' : 'text-muted-foreground' }}">
                <span class="min-w-0 truncate">{{ $n['label'] }}</span>
                <bdi class="text-caption tabular-nums" x-text="n(count(@js($target), 'cat', @js($n['id'])))">{{ number_format($n['count']) }}</bdi>
            </button>
            @if (! empty($n['children']))
                <div x-show="catOpen(@js($target), @js($n['id']))" @unless ($n['open']) style="display: none" @endunless>
                    @include('nasaq::components.store-listing._category-tree', ['nodes' => $n['children'], 'target' => $target, 'depth' => $depth + 1])
                </div>
            @endif
        </li>
    @endforeach
</ul>

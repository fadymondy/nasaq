{{-- <x-nq::api-reference :tools="$tools" />   <x-nq::api-reference :tools="$tools" default-view="catalog" x-on:nq:pick="…" />
     An API or MCP tool reference: a searchable list of tools beside the selected tool's scope, minimum role, arguments table and
     example call and result, plus a catalog view with cards. It renders the data you pass; generate it from your schema.
     tools: [['id', 'name', 'summary', 'description', 'category', 'scope', 'minRole', 'access' => read|write|destructive, 'args', 'returns',
              'examples', 'deprecated', 'since']] (see <x-nq::api-reference.detail> for args and examples). Search, the category chips and the
     access filter run in the browser over the rendered tools. selected-id: the tool open first (default the first). default-view:
     reference (list plus detail, default) | catalog (cards). Pressing a card opens that tool in the reference view.
     Fires nq:select ({ id }) when a tool opens and nq:view ({ view }) when the view changes. Siblings: api-reference.detail, api-reference.catalog.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['tools' => [], 'selectedId' => null, 'defaultView' => 'reference'])
@php
    $t = \Nasaq\Nasaq::class;
    $tools = array_values((array) $tools);
    $defaultView = $defaultView === 'catalog' ? 'catalog' : 'reference';
    $categories = collect($tools)->pluck('category')->filter()->unique()->values()->all();
    $groups = collect($tools)->groupBy(fn ($x) => $x['category'] ?? '')->map(fn ($g) => $g->pluck('id')->values()->all())->values()->all();
    $openId = $selectedId ?? ($tools[0]['id'] ?? null);
    $config = [
        'defaultView' => $defaultView,
        'selectedId' => $openId,
        'groups' => $groups,
        'tools' => collect($tools)->map(fn ($x) => [
            'id' => (string) $x['id'], 'name' => $x['name'], 'summary' => $x['summary'], 'category' => $x['category'] ?? null,
            'scope' => $x['scope'], 'access' => $x['access'] ?? 'read', 'args' => collect($x['args'] ?? [])->pluck('name')->all(),
        ])->all(),
        'labels' => [
            'results' => $t::t('{n} tools', '{n} أداة'),
        ],
    ];
    $viewReference = $defaultView === 'reference';
    $emptyTitle = $t::t('No tools match', 'لا أدوات مطابقة');
    $emptyBody = $t::t('Try another word or clear the filters.', 'جرّب كلمة أخرى أو امسح التصفية.');
    $clear = $t::t('Clear filters', 'مسح التصفية');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'api-reference') }}" x-data="nqApiReference(@js($config))" x-bind:data-view="view" x-on:nq:pick="pick($event.detail.id)"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-body-sm text-muted-foreground" role="status" x-text="resultsLabel"></p>
        <x-nq::toggle-group x-model="viewValue" :default-value="[$defaultView]" aria-label="{{ $t::t('View', 'العرض') }}">
            <x-nq::toggle-group.toggle value="reference">
                <x-lucide-wrench aria-hidden="true" />
                {{ $t::t('Reference', 'المرجع') }}
            </x-nq::toggle-group.toggle>
            <x-nq::toggle-group.toggle value="catalog">
                <x-lucide-layout-grid aria-hidden="true" />
                {{ $t::t('Catalog', 'الفهرس') }}
            </x-nq::toggle-group.toggle>
        </x-nq::toggle-group>
    </div>

    <div class="flex min-w-0 flex-col gap-4" x-show="catalogView" @if ($viewReference) style="display: none" @endif>
        <x-nq::api-reference.filters :categories="$categories" />
        <x-nq::api-reference.catalog :tools="$tools" bound />
        <x-nq::states.empty :title="$emptyTitle" :description="$emptyBody" x-show="empty" style="display: none">
            <x-slot:actions><x-nq::button variant="secondary" x-on:click="clear()">{{ $clear }}</x-nq::button></x-slot:actions>
        </x-nq::states.empty>
    </div>

    <div class="grid min-w-0 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]" x-show="referenceView" @unless ($viewReference) style="display: none" @endunless>
        <nav aria-label="{{ $t::t('Tools', 'الأدوات') }}" class="flex min-w-0 flex-col gap-3 lg:self-start" x-bind:class="mobileList ? '' : 'max-lg:hidden'">
            <x-nq::api-reference.filters :categories="$categories" />
            <x-nq::states.empty :title="$emptyTitle" :description="$emptyBody" x-show="empty" style="display: none">
                <x-slot:actions><x-nq::button variant="secondary" x-on:click="clear()">{{ $clear }}</x-nq::button></x-slot:actions>
            </x-nq::states.empty>
            <div class="flex max-h-[calc(100vh-14rem)] min-h-40 flex-col gap-3 overflow-y-auto" x-show="! empty">
                @foreach (collect($tools)->groupBy(fn ($x) => $x['category'] ?? '') as $category => $list)
                    <section class="flex flex-col gap-1" x-show="groupShown({{ $loop->index }})">
                        @if ($category !== '')
                            <h3 class="eyebrow px-2">{{ $category }}</h3>
                        @endif
                        <ul class="flex flex-col">
                            @foreach ($list as $tool)
                                <li x-show="matches(@js((string) $tool['id']))">
                                    <button type="button" data-tool-link="{{ $tool['id'] }}"
                                        x-on:click="pick(@js((string) $tool['id']))" x-bind:aria-current="isOpen(@js((string) $tool['id'])) ? 'true' : null"
                                        class="flex w-full min-w-0 flex-col items-start gap-0.5 rounded-control px-2 py-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-[current=true]:bg-secondary">
                                        <bdi dir="ltr" class="max-w-full truncate font-mono text-code text-foreground">{{ $tool['name'] }}</bdi>
                                        <span dir="auto" class="line-clamp-1 max-w-full text-caption text-muted-foreground">{{ $tool['summary'] }}</span>
                                    </button>
                                </li>
                            @endforeach
                        </ul>
                    </section>
                @endforeach
            </div>
        </nav>
        <div class="min-w-0" x-bind:class="mobileList ? 'max-lg:hidden' : ''">
            <x-nq::button variant="ghost" size="sm" class="mb-3 lg:hidden" x-on:click="mobileList = true">
                <x-lucide-arrow-left aria-hidden="true" class="rtl:hidden" />
                <x-lucide-arrow-right aria-hidden="true" class="hidden rtl:block" />
                {{ $t::t('All tools', 'كل الأدوات') }}
            </x-nq::button>
            @forelse ($tools as $tool)
                <x-nq::api-reference.detail :tool="$tool" x-show="isOpen($el.dataset.tool)" :style="(string) $tool['id'] !== (string) $openId ? 'display: none' : null" />
            @empty
                <x-nq::states.empty :title="$emptyTitle" :description="$emptyBody" />
            @endforelse
        </div>
    </div>
</div>

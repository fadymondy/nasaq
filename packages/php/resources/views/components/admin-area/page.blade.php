{{-- <x-nq::admin-area.page title="Users" description="Everyone with access" :breadcrumbs="[['label' => 'People', 'href' => '/people'], ['label' => 'Users']]"> <x-slot:actions> buttons </x-slot:actions> content </x-nq::admin-area.page>
     The body of an admin screen: breadcrumb, title, description, page actions, then your content.
     title / description: strings, or the title / description slots. breadcrumbs: [['label', 'href']]; the last one is the current page.
     breadcrumb-label: the nav's aria-label. Slot: actions (inline end of the title). Static: no Alpine needed. --}}
@props(['title' => null, 'description' => null, 'breadcrumbs' => [], 'breadcrumbLabel' => null, 'actions' => null])
<div data-slot="{{ $attributes->get('data-slot', 'admin-page') }}" {{ $attributes->except('data-slot')->cn('mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6') }}>
    <header class="flex flex-col gap-3">
        @if (count($breadcrumbs))
            <x-nq::breadcrumb :aria-label="$breadcrumbLabel ?? \Nasaq\Nasaq::t('Breadcrumb', 'مسار التنقل')">
                <x-nq::breadcrumb.list>
                    @foreach ($breadcrumbs as $i => $crumb)
                        @if ($i > 0)<x-nq::breadcrumb.separator />@endif
                        <x-nq::breadcrumb.item>
                            @if ($i === count($breadcrumbs) - 1 || empty($crumb['href']))
                                <x-nq::breadcrumb.page>{{ $crumb['label'] }}</x-nq::breadcrumb.page>
                            @else
                                <x-nq::breadcrumb.link :href="$crumb['href']">{{ $crumb['label'] }}</x-nq::breadcrumb.link>
                            @endif
                        </x-nq::breadcrumb.item>
                    @endforeach
                </x-nq::breadcrumb.list>
            </x-nq::breadcrumb>
        @endif
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
                <h1 class="text-h1 text-foreground">{{ $title }}</h1>
                @if ($description)<p class="text-body text-muted-foreground">{{ $description }}</p>@endif
            </div>
            @if ($actions !== null && ! $actions->isEmpty())<div class="flex flex-wrap items-center gap-2">{{ $actions }}</div>@endif
        </div>
    </header>
    {{ $slot }}
</div>

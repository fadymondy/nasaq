{{-- <x-nq::page-header title="Customers" description="..." :breadcrumbs="[['label'=>'Sales','href'=>'/sales'],['label'=>'Customers']]"> <x-slot:actions>...</x-slot:actions> </x-nq::page-header>
     The top of a page: back link or breadcrumbs, title, description, meta facts and actions at the inline end. Slots: the default slot replaces the title text; named slots meta and actions.
     back-href: a "Back" link. as: h1 | h2. Static: no Alpine needed. --}}
@props(['title' => null, 'description' => null, 'breadcrumbs' => null, 'backHref' => null, 'as' => 'h1'])
@php
    $crumbs = array_values((array) $breadcrumbs);
    $last = count($crumbs) - 1;
    $heading = $as === 'h2' ? 'h2' : 'h1';
@endphp
<header data-slot="{{ $attributes->get('data-slot', 'page-header') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    @if (count($crumbs) > 0)
        <div data-slot="page-header-breadcrumbs" class="contents"><x-nq::breadcrumb>
            <x-nq::breadcrumb.list>
                @foreach ($crumbs as $i => $crumb)
                    <x-nq::breadcrumb.item>
                        @if (! empty($crumb['href']) && $i < $last)
                            <x-nq::breadcrumb.link :href="$crumb['href']">{{ $crumb['label'] }}</x-nq::breadcrumb.link>
                        @else
                            <x-nq::breadcrumb.page>{{ $crumb['label'] }}</x-nq::breadcrumb.page>
                        @endif
                    </x-nq::breadcrumb.item>
                    @if ($i < $last)<x-nq::breadcrumb.separator />@endif
                @endforeach
            </x-nq::breadcrumb.list>
        </x-nq::breadcrumb></div>
    @endif
    @if ($backHref !== null)
        <a data-slot="page-header-back" href="{{ $backHref }}"
            class="inline-flex w-fit items-center gap-1.5 rounded-control text-body-sm text-muted-foreground transition-colors duration-150 ease-nq outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4">
            <x-nq::icon name="arrow-left" directional />
            {{ \Nasaq\Nasaq::t('Back', 'رجوع') }}
        </a>
    @endif
    <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div class="flex min-w-0 flex-1 basis-80 flex-col gap-1">
            <{{ $heading }} data-slot="page-header-title" class="text-h1 text-balance text-foreground">{{ $slot->isNotEmpty() ? $slot : $title }}</{{ $heading }}>
            @if ($description)
                <p data-slot="page-header-description" class="max-w-prose text-pretty text-body-sm text-muted-foreground">{{ $description }}</p>
            @endif
            @if (isset($meta) && $meta->isNotEmpty())
                <div data-slot="page-header-meta" class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">{{ $meta }}</div>
            @endif
        </div>
        @if (isset($actions) && $actions->isNotEmpty())
            <div data-slot="page-header-actions" class="flex shrink-0 flex-wrap items-center gap-2">{{ $actions }}</div>
        @endif
    </div>
</header>

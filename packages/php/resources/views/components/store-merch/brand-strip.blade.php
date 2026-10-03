{{-- <x-nq::store-merch.brand-strip :brands="[['id' => 'acme', 'name' => 'Acme', 'href' => '/brand/acme'], ['id' => 'nova', 'name' => 'Nova', 'logo' => '/nova.svg']]" />
     A calm row of brand names or official logos. A brand links to its shop page when it has href. Never recolour or redraw a logo.
     brands: id, name, href?, logo? (URL; the name shows as text without it). title: heading (default "Our brands"; null hides it).
     labels: string overrides. A click on a link bubbles; its data-id says which brand. --}}
@include('nasaq::components.store-merch._strings')
@props(['brands' => [], 'title' => '__default', 'labels' => null])
@php $heading = $title === '__default' ? nq_merch_t('brands', [], $labels) : $title; @endphp
@if (count($brands))
    <section data-slot="{{ $attributes->get('data-slot', 'store-brand-strip') }}" @if ($heading) aria-labelledby="store-brands-h" @else aria-label="{{ nq_merch_t('brands', [], $labels) }}" @endif {{ $attributes->except('data-slot') }}>
        @if ($heading)<h2 id="store-brands-h" class="mb-3 text-center text-label text-muted-foreground">{{ $heading }}</h2>@endif
        <ul class="m-0 flex list-none flex-wrap items-center justify-center gap-x-8 gap-y-3 p-0">
            @foreach ($brands as $b)
                @php $link = ! empty($b['href']); @endphp
                <li>
                    @if ($link)
                        <a href="{{ $b['href'] }}" data-id="{{ $b['id'] }}" aria-label="{{ nq_merch_t('brandLink', ['name' => $b['name']], $labels) }}" class="inline-flex min-h-control items-center rounded-control px-2 text-muted-foreground no-underline outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                    @else
                        <span class="inline-flex min-h-control items-center px-2 text-muted-foreground">
                    @endif
                    @if (! empty($b['logo']))
                        <img src="{{ $b['logo'] }}" alt="{{ $b['name'] }}" loading="lazy" class="h-8 w-auto max-w-28 object-contain grayscale transition hover:grayscale-0 motion-reduce:transition-none">
                    @else
                        <span class="text-h3 font-semibold tracking-tight">{{ $b['name'] }}</span>
                    @endif
                    @if ($link)</a>@else</span>@endif
                </li>
            @endforeach
        </ul>
    </section>
@endif

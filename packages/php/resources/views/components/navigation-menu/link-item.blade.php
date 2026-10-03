{{-- <x-nq::navigation-menu.link-item href="/docs" title="Docs" description="Guides and API" icon="book-open" />
     icon: a lucide name, or an <x-slot:icon>. Slots: title, description override the props. --}}
@props(['href' => '#', 'title' => null, 'description' => null, 'icon' => null, 'active' => false])
<li data-slot="navigation-menu-link-item" class="m-0 list-none">
    <a href="{{ $href }}" @if ($active) data-active aria-current="page" @endif
        {{ $attributes->cn([
            'flex items-start gap-3 rounded-control p-2.5 text-start no-underline outline-none transition-colors duration-150 ease-nq',
            'hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-active:bg-nq-selected',
        ]) }}>
        @if ($icon)
            <span aria-hidden="true" class="mt-0.5 inline-flex shrink-0 text-muted-foreground [&_svg]:size-5">
                @if (is_string($icon))<x-dynamic-component :component="'lucide-'.$icon" />@else{{ $icon }}@endif
            </span>
        @endif
        <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-label text-foreground">{{ $title }}</span>
            @if ($description)<span class="text-body-sm text-muted-foreground">{{ $description }}</span>@endif
        </span>
    </a>
</li>

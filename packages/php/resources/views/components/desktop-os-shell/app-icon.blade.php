{{-- <x-nq::desktop-os-shell.app-icon icon="folder" />  or  <x-nq::desktop-os-shell.app-icon><x-lucide-folder /></x-nq::desktop-os-shell.app-icon>
     A rounded icon tile with a token background, for the dock, the launchpad and the desktop icons. icon: a lucide name; or put any glyph in the slot. --}}
@props(['icon' => null])
<span data-slot="{{ $attributes->get('data-slot', 'desktop-app-icon') }}" {{ $attributes->except('data-slot')->cn('grid size-full place-items-center rounded-[22%] bg-card text-primary shadow-sm ring-1 ring-border [&_svg]:size-1/2') }}>
    @if ($icon)<x-dynamic-component :component="'lucide-'.$icon" aria-hidden="true" />@endif{{ $slot }}
</span>

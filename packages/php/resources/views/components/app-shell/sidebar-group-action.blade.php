{{-- <x-nq::app-shell.sidebar-group-action aria-label="New project"><x-lucide-plus /></x-nq::app-shell.sidebar-group-action>
     A small icon button for a group label. Put it in the group's action slot. Takes the button props. --}}
<x-nq::button variant="ghost" size="icon-sm" {{ $attributes->cn('size-6 text-muted-foreground [&_svg]:size-3.5') }}>{{ $slot }}</x-nq::button>

{{-- <x-nq::app-shell.nav-item href="/billing" :active="true"> <x-slot:icon><x-lucide-credit-card /></x-slot:icon> Billing <x-slot:trailing>New</x-slot:trailing> </x-nq::app-shell.nav-item>
     A tab for app-shell.nav. The current one gets a solid underline and stronger text, never colour alone. icon shows on the mobile bar and in its More sheet (give every item one); trailing is a count or "New"
     (on the mobile bar it becomes a dot on the icon). Use only inside app-shell.nav: it emits the desktop tab, the bar item and the sheet row, which the nav sorts into place. --}}
@props(['active' => false, 'icon' => null, 'trailing' => null])
@php
    $hasIcon = $icon !== null && ! $icon->isEmpty();
    $hasTrailing = $trailing !== null && ! $trailing->isEmpty();
    $current = $active ? 'aria-current="page"' : '';
    $bar = implode(' ', [
        'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1.5 text-caption text-muted-foreground outline-none',
        'transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-5',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        $active ? 'font-medium text-foreground' : '',
    ]);
@endphp
<!--nq-nav--><a data-slot="{{ $attributes->get('data-slot', 'app-nav-item') }}" {!! $current !!} {{ $attributes->except('data-slot')->cn([
    'relative flex h-11 shrink-0 items-center gap-2 px-2 text-body-sm whitespace-nowrap text-muted-foreground outline-none',
    'transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4',
    'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent',
    'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-nq-focus',
    'font-medium text-foreground after:bg-foreground' => $active,
]) }}>@if ($hasIcon)<span data-slot="app-nav-icon" class="contents">{{ $icon }}</span>@endif{{ $slot }}@if ($hasTrailing)<span class="text-caption text-muted-foreground tabular-nums">{{ $trailing }}</span>@endif</a><!--nq-nav-split--><a data-slot="{{ $attributes->get('data-slot', 'app-nav-item') }}" {!! $current !!} @if ($active) data-active @endif {{ $attributes->except('data-slot')->cn($bar) }}><span class="relative inline-flex">{{ $icon }}@if ($hasTrailing)<span aria-hidden="true" class="absolute -end-1 -top-0.5 size-2 rounded-full bg-nq-accent ring-2 ring-background"></span>@endif</span><span class="max-w-full truncate">{{ $slot }}</span></a><!--nq-nav-split--><a data-slot="{{ $attributes->get('data-slot', 'app-nav-item') }}" {!! $current !!} @if ($active) data-active @endif {{ $attributes->except('data-slot')->cn([
    'flex h-11 items-center gap-3 rounded-control px-3 text-body text-foreground outline-none',
    'transition-colors duration-150 ease-nq hover:bg-nq-hover [&_svg]:size-5 [&_svg]:text-muted-foreground',
    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
    'bg-nq-selected font-medium' => $active,
]) }}>{{ $icon }}<span class="min-w-0 flex-1 truncate">{{ $slot }}</span>@if ($hasTrailing)<span class="text-caption text-muted-foreground tabular-nums">{{ $trailing }}</span>@endif</a><!--nq-nav-end-->

{{-- <x-nq::app-shell> <x-slot:sidebar> <x-nq::app-shell.sidebar> ... </x-nq::app-shell.sidebar> </x-slot:sidebar> <x-nq::app-shell.header> ... </x-nq::app-shell.header> <x-nq::app-shell.main> ... </x-nq::app-shell.main> </x-nq::app-shell>
     The shell every product re-solved: a sidebar at the inline start, a header, and the page. Cmd/Ctrl+B toggles the rail; below md the sidebar moves into a sheet opened from the header trigger.
     Leave the sidebar slot out for top navigation. Parts: sidebar, sidebar-trigger, sidebar-brand, sidebar-header, sidebar-content, sidebar-group, sidebar-group-action, sidebar-item, sidebar-nest, sidebar-sub-item,
     sidebar-footer, sidebar-expanded-only, sidebar-status, header, main, breadcrumbs, crumb, nav, nav-item, page-header, footer, footer-link.
     variant: plain (default) | inset (the page sits on its own rounded panel, md+). default-collapsed: start as the icon rail.
     collapsed: controlled rail state (x-modelable, so x-model and wire:model work); when set nothing is remembered.
     resizable: drag the sidebar edge (default true). default-width / min-width / max-width: px (256 / 208 / 420). resize-label: the handle's name.
     offset: height taken from above the shell (an Electron title bar): a number is px, a string any CSS length; sets --nasaq-shell-offset.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['variant' => 'plain', 'defaultCollapsed' => false, 'collapsed' => null, 'resizable' => true, 'defaultWidth' => 256, 'minWidth' => 208, 'maxWidth' => 420, 'resizeLabel' => null, 'offset' => null, 'sidebar' => null])
@php
    $hasSidebar = $sidebar !== null && ! $sidebar->isEmpty();
    $startCollapsed = (bool) ($collapsed ?? $defaultCollapsed);
    $inset = $variant === 'inset';
    $options = ['collapsed' => $startCollapsed, 'persist' => $collapsed === null, 'sidebar' => $hasSidebar, 'width' => (int) $defaultWidth, 'minWidth' => (int) $minWidth, 'maxWidth' => (int) $maxWidth];
@endphp
<div data-slot="app-shell" data-variant="{{ $variant }}" data-navigation="{{ $hasSidebar ? 'sidebar' : 'top' }}"
    x-data="nqAppShell(@js($options))" x-modelable="collapsed" x-id="['nq-shell']" x-bind="root"
    @if ($offset !== null) style="--nasaq-shell-offset: {{ is_numeric($offset) ? $offset.'px' : $offset }}" @endif
    {{ $attributes->cn([
        'flex min-h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] bg-background text-foreground',
        'has-data-[slot=app-nav-bar]:max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]',
        'md:bg-sidebar' => $inset,
    ]) }}>
    <a href="#app-main" class="sr-only rounded-control border border-border bg-popover text-label text-foreground shadow-md focus:not-sr-only focus:fixed focus:start-3 focus:top-2 focus:z-50 focus:px-3 focus:py-2 focus-visible:outline-2 focus-visible:outline-nq-focus">{{ \Nasaq\Nasaq::t('Skip to content', 'تخطَّ إلى المحتوى') }}</a>
    @if ($hasSidebar)
        <aside data-slot="app-sidebar" @if ($startCollapsed) data-collapsed @endif
            :data-collapsed="collapsed ? '' : undefined" :data-resizing="resizing ? '' : undefined"
            style="--nq-sidebar-width: {{ (int) $defaultWidth }}px" :style="{ '--nq-sidebar-width': width + 'px' }"
            class="group/sidebar sticky top-[var(--nasaq-shell-offset,0px)] hidden h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] w-(--nq-sidebar-width) shrink-0 border-e border-border bg-sidebar transition-[width] duration-200 ease-nq data-collapsed:w-[calc(var(--nq-control)+2*var(--nq-shell-pad))] data-resizing:transition-none md:block {{ $inset ? 'md:border-e-0' : '' }}">
            <div x-data="{ rail: true }" class="h-full overflow-hidden">{{ $sidebar }}</div>
            @if ($resizable)
                <div role="separator" aria-orientation="vertical" aria-label="{{ $resizeLabel ?? \Nasaq\Nasaq::t('Resize sidebar', 'تغيير عرض الشريط الجانبي') }}"
                    aria-valuemin="{{ (int) $minWidth }}" aria-valuemax="{{ (int) $maxWidth }}" aria-valuenow="{{ (int) $defaultWidth }}" tabindex="{{ $startCollapsed ? -1 : 0 }}"
                    data-slot="sidebar-resize-handle" x-bind="handle"
                    class="absolute inset-y-0 -end-[5px] z-20 w-[9px] cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:start-1 after:w-0.5 after:bg-transparent after:transition-colors after:duration-150 hover:after:bg-nq-line-strong focus-visible:after:bg-nq-focus"></div>
            @endif
        </aside>
        <template x-teleport="body">
            <div data-slot="app-shell-sheet-portal">
                <div data-slot="app-shell-sheet-backdrop" x-nq-presence="mobileOpen" x-on:click="mobileOpen = false"
                    class="fixed inset-0 z-40 bg-nq-fg/15 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 md:hidden dark:bg-nq-bg/70"></div>
                <div data-slot="app-shell-sheet" role="dialog" aria-modal="true" :aria-labelledby="$id('nq-shell', 'title')" tabindex="-1"
                    x-nq-presence="mobileOpen" x-trap.noscroll="mobileOpen" x-on:keydown.escape.prevent.stop="mobileOpen = false"
                    class="fixed inset-y-0 start-0 z-50 w-[min(18rem,85vw)] border-e border-border bg-sidebar outline-none transition-[translate,opacity] duration-200 ease-nq data-ending-style:-translate-x-8 data-ending-style:opacity-0 data-starting-style:-translate-x-8 data-starting-style:opacity-0 rtl:data-ending-style:translate-x-8 rtl:data-starting-style:translate-x-8 md:hidden">
                    <h2 :id="$id('nq-shell', 'title')" class="sr-only">{{ \Nasaq\Nasaq::t('Navigation', 'التنقل') }}</h2>
                    <div x-data="{ rail: false }" class="h-full" x-on:click="if ($event.target.closest('a')) mobileOpen = false">{{ $sidebar }}</div>
                </div>
            </div>
        </template>
    @endif
    @if ($inset)
        <div data-slot="app-shell-panel-frame" class="flex min-w-0 flex-1 flex-col md:h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] md:py-2 md:pe-2">
            <div data-slot="app-shell-panel" class="flex min-w-0 flex-1 flex-col bg-background md:overflow-y-auto md:rounded-xl md:border md:border-border md:shadow-xs">{{ $slot }}</div>
        </div>
    @else
        <div class="flex min-w-0 flex-1 flex-col">{{ $slot }}</div>
    @endif
</div>

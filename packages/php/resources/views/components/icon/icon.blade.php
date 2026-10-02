{{-- <x-nq::icon name="arrow-right" class="size-5" />   <x-nq::icon name="search" label="Search" />
     name: a lucide icon name (kebab-case), rendered with <x-lucide-NAME>. Directional icons (arrows, chevrons, undo ...)
     mirror in RTL via rtl:-scale-x-100; pass :directional="true|false" to force it. label makes it role="img". --}}
@props(['name', 'directional' => null, 'label' => null])
@php
    $directionalIcons = [
        'ArrowLeft', 'ArrowRight', 'ArrowUpLeft', 'ArrowUpRight', 'ArrowDownLeft', 'ArrowDownRight',
        'ChevronLeft', 'ChevronRight', 'ChevronsLeft', 'ChevronsRight', 'ChevronFirst', 'ChevronLast',
        'CornerDownLeft', 'CornerDownRight', 'CornerUpLeft', 'CornerUpRight',
        'Undo', 'Undo2', 'Redo', 'Redo2', 'Reply', 'ReplyAll', 'Forward', 'Send', 'SendHorizontal',
        'LogIn', 'LogOut', 'ExternalLink', 'SquareArrowOutUpRight', 'PanelLeft', 'PanelRight',
        'PanelLeftClose', 'PanelLeftOpen', 'PanelRightClose', 'PanelRightOpen', 'TextAlignStart', 'TextAlignEnd', 'ListIndentIncrease', 'ListIndentDecrease',
        'ArrowLeftToLine', 'ArrowRightToLine', 'ArrowLeftFromLine', 'ArrowRightFromLine', 'ArrowBigLeft', 'ArrowBigRight',
        'MoveLeft', 'MoveRight', 'Indent', 'IndentIncrease', 'IndentDecrease', 'Outdent', 'ListStart', 'ListEnd',
        'Sidebar', 'SidebarOpen', 'SidebarClose', 'SquareArrowLeft', 'SquareArrowRight', 'CircleArrowLeft', 'CircleArrowRight',
    ];
    $kebab = \Illuminate\Support\Str::kebab($name);
    $mirror = $directional ?? in_array(\Illuminate\Support\Str::studly($kebab), $directionalIcons, true);
@endphp
<x-dynamic-component :component="'lucide-'.$kebab" data-slot="{{ $attributes->get('data-slot', 'icon') }}"
    {{ $attributes->except('data-slot')->cn([$mirror ? 'rtl:-scale-x-100' : ''])->merge($label ? ['role' => 'img', 'aria-label' => $label] : ['aria-hidden' => 'true']) }} />

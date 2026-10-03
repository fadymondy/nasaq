{{-- <x-nq::app-shell.sidebar-trigger />
     Toggles the rail on desktop and opens the sheet on mobile. Place it first in the header. label: its name (default "Toggle sidebar"). --}}
@props(['label' => null])
@php($name = $label ?? \Nasaq\Nasaq::t('Toggle sidebar', 'إظهار/إخفاء الشريط الجانبي'))
<x-nq::tooltip :content="$name">
    <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $name }}" x-on:click="toggle()" x-bind:aria-expanded="desktop ? !collapsed : mobileOpen"
        {{ $attributes->cn('-ms-1 text-muted-foreground') }}><x-lucide-panel-left class="rtl:-scale-x-100" /></x-nq::button>
</x-nq::tooltip>

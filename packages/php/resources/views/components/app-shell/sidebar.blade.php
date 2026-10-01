{{-- <x-nq::app-shell.sidebar> header, content, footer </x-nq::app-shell.sidebar>   Goes in the shell's sidebar slot.
     icons: always (default) | mobile: a text-only list on the desktop column; icons return in the phone sheet and on the collapsed rail. --}}
@props(['icons' => 'always'])
<nav data-slot="sidebar" data-icons="{{ $icons }}"
    {{ $attributes->merge(['aria-label' => \Nasaq\Nasaq::t('Main', 'الرئيسية')])->cn([
        'flex h-full flex-col gap-shell overflow-y-auto overflow-x-hidden p-shell',
        'group-not-data-collapsed/sidebar:md:[&_[data-slot=sidebar-icon]]:hidden' => $icons === 'mobile',
    ]) }}>{{ $slot }}</nav>

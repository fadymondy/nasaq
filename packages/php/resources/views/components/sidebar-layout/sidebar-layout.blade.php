{{-- <x-nq::sidebar-layout storage-key="my-app-nav" :items="[['id' => 'home', 'label' => 'Home', 'icon' => 'layout-dashboard', 'required' => true], ['id' => 'inbox', 'label' => 'Inbox', 'icon' => 'inbox']]">
       <x-nq::sidebar-layout.sortable><x-nq::sidebar-layout.sortable-item id="inbox"><a href="/inbox">Inbox</a></x-nq::sidebar-layout.sortable-item></x-nq::sidebar-layout.sortable>
       <x-nq::sidebar-layout.trigger>Customize sidebar</x-nq::sidebar-layout.trigger>
       <x-nq::sidebar-layout.customize />
     </x-nq::sidebar-layout>
     Order and visibility of the sidebar's items, saved to localStorage under storage-key. items: [id, label, icon (a lucide name), required]
     describe the list; default-hidden lists ids that start switched off. For several lists pass :sections="[['id', 'label', 'storageKey', 'items', 'defaultHidden']]"
     instead; parts then take section="id". open: start with the dialog open (x-modelable, so wire:model and x-model work).
     moved: announcement after a keyboard move, with :label, :position and :total. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['storageKey' => 'nasaq-sidebar', 'items' => [], 'sections' => null, 'defaultHidden' => [], 'open' => false, 'moved' => null])
@php
    $lists = $sections ?? [['id' => 'main', 'storageKey' => $storageKey, 'items' => $items, 'defaultHidden' => $defaultHidden]];
    $config = [
        'sections' => collect($lists)->map(fn ($s) => [
            'id' => $s['id'],
            'label' => $s['label'] ?? null,
            'storageKey' => $s['storageKey'] ?? $storageKey.'-'.$s['id'],
            'ids' => collect($s['items'])->pluck('id')->values()->all(),
            'defaultHidden' => array_values($s['defaultHidden'] ?? []),
        ])->values()->all(),
        'open' => (bool) $open,
        'moved' => $moved ?? \Nasaq\Nasaq::t(':label, position :position of :total', ':label، الموضع :position من :total'),
    ];
@endphp
<div data-slot="sidebar-layout" x-data="nqSidebarLayout(@js($config))" x-modelable="open" x-id="['nq-dialog']" {{ $attributes->cn('contents') }}>
    {{ $slot }}
</div>

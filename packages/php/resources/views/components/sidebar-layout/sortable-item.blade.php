{{-- <x-nq::sidebar-layout.sortable-item id="inbox"><a href="/inbox">Inbox</a></x-nq::sidebar-layout.sortable-item>
     One draggable sidebar item. id: the same id as in the layout's items. section: which list it belongs to (default: the first).
     Mouse drags start after 4px, touch after a 250ms press. Keyboard reordering lives in sidebar-layout.customize.
     Put the items inside sidebar-layout.sortable (or any flex column of only these items): the saved order is applied with CSS order. --}}
@aware(['storageKey' => 'nasaq-sidebar', 'items' => [], 'sections' => null, 'defaultHidden' => []])
@props(['id', 'section' => null])
@php
    $lists = $sections ?? [['id' => 'main', 'items' => $items, 'defaultHidden' => $defaultHidden]];
    $list = collect($lists)->firstWhere('id', $section ?? $lists[0]['id']) ?? $lists[0];
    $sec = $list['id'];
    $position = array_search($id, collect($list['items'])->pluck('id')->all(), true);
    $hiddenByDefault = in_array($id, $list['defaultHidden'] ?? [], true);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'sidebar-sortable-item') }}" data-sortable-id="{{ $id }}"
    x-show="isVisible(@js($sec), @js($id))" :style="{ order: position(@js($sec), @js($id)) }"
    x-on:pointerdown="press($event, @js($sec), @js($id))" x-on:click.capture="swallowClick($event)" x-on:dragstart.prevent
    style="order: {{ (int) $position }}; @if ($hiddenByDefault) display: none; @endif"
    {{ $attributes->except('data-slot')->cn([
        'relative [&_a]:[-webkit-user-drag:none]',
        'data-dragging:z-10 data-dragging:cursor-grabbing data-dragging:*:bg-nq-surface-overlay data-dragging:*:shadow-floating',
    ]) }}>{{ $slot }}</div>

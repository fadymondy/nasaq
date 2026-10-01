{{-- <x-nq::account-settings.panel id="security"> sections </x-nq::account-settings.panel>
     The content of one item. id must equal an item id; the region is named by that item's nav button (label overrides it).
     Every panel is rendered; the inactive ones are hidden. --}}
@aware(['value' => null, 'items' => null])
@props(['id', 'label' => null])
<div data-slot="account-settings-content" data-section="{{ $id }}" role="region" x-bind="panel(@js($id))"
    @if ($label) aria-label="{{ $label }}" @endif
    @if ((string) $value !== (string) $id) hidden @endif
    {{ $attributes->cn('flex min-w-0 flex-col gap-6') }}>{{ $slot }}</div>

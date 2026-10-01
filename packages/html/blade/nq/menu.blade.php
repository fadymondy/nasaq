{{-- Dropdown (needs the Nasaq Alpine plugin). The trigger slot is the content of the trigger button:
     <x-nq.menu label="Order actions" trigger-label="Actions" size="icon-sm" variant="ghost">
         <x-slot:trigger>⋯</x-slot:trigger>
         <x-nq.menu-item href="/orders/7">Open</x-nq.menu-item>
         <x-nq.menu-item wire:click="archive(7)">Archive</x-nq.menu-item>
         <div class="nq-menu-separator" role="separator"></div>
         <x-nq.menu-item variant="danger" wire:click="delete(7)">Delete</x-nq.menu-item>
     </x-nq.menu> --}}
@props(['label' => null, 'triggerLabel' => null, 'variant' => 'secondary', 'size' => 'md'])
<div x-data="nqMenu" {{ $attributes->merge(['style' => 'display:inline-block']) }}>
    <button type="button" class="nq-button" data-variant="{{ $variant }}" data-size="{{ $size }}" x-bind="trigger"
        @if ($triggerLabel) aria-label="{{ $triggerLabel }}" @endif>{{ $trigger }}</button>
    <div x-bind="menu" x-cloak @if ($label) aria-label="{{ $label }}" @endif>{{ $slot }}</div>
</div>

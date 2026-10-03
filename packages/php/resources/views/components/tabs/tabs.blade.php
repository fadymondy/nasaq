{{-- <x-nq::tabs default-value="board"> list + panels </x-nq::tabs>
     Switches between views of the same subject. value is x-modelable: wire:model="tab" works.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['defaultValue' => null, 'orientation' => 'horizontal'])
<div data-slot="{{ $attributes->get('data-slot', 'tabs') }}" data-orientation="{{ $orientation }}" x-data="nqTabs(@js($defaultValue))" x-modelable="value" x-id="['nq-tabs']" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    {{ $slot }}
</div>

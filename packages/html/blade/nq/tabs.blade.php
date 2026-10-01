{{-- Tabs (needs the Nasaq Alpine plugin):
     <x-nq.tabs :tabs="['overview' => 'Overview', 'activity' => 'Activity']" active="overview">
         <x-slot:overview>…</x-slot:overview>
         <x-slot:activity>…</x-slot:activity>
     </x-nq.tabs>
     Tab keys must be valid slot names (letters, digits, underscores). variant="underline" for the line style. --}}
@props(['tabs' => [], 'active' => null, 'variant' => 'default', 'label' => null])
<div x-data="nqTabs(@js($active ?? array_key_first($tabs)))" {{ $attributes }}>
    <div class="nq-tabs-list" role="tablist" @if ($label) aria-label="{{ $label }}" @endif @if ($variant === 'underline') data-variant="underline" @endif>
        @foreach ($tabs as $key => $text)
            <button x-bind="tab(@js($key))">{{ $text }}</button>
        @endforeach
    </div>
    @foreach ($tabs as $key => $text)
        <div x-bind="panel(@js($key))" x-cloak>{{ $__data[$key] ?? '' }}</div>
    @endforeach
</div>

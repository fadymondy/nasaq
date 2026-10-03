{{-- <x-nq::settings-sections.page id="notifications"> setting rows </x-nq::settings-sections.page>
     The content of one page. id must equal a page id in the groups. Every page is rendered; the inactive ones are hidden. --}}
@aware(['value' => null])
@props(['id'])
<div data-section="{{ $id }}" x-bind="page(@js($id))"
    @if ((string) $value !== (string) $id) hidden @endif
    {{ $attributes->cn('flex min-w-0 flex-col gap-6') }}>{{ $slot }}</div>

{{-- <x-nq::text-utilities.bookmark-button show-label @saved-change="$event.detail.wait(save($event.detail.saved))" />
     A save or bookmark toggle. Optimistic, announces the change to screen readers, and reverts with a message on failure.
     saved is x-modelable (x-model / wire:model); default-saved sets the start. Each change fires "saved-change" with { saved, wait(promise) }:
     the button flips at once and goes back if the promise rejects or resolves with { error }. show-label shows the word next to the icon.
     variant, size, disabled as <x-nq::button>. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['saved' => false, 'showLabel' => false, 'variant' => 'ghost', 'size' => null, 'disabled' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $saved = (bool) $saved;
    $text = $saved ? $t::t('Saved', 'محفوظ') : $t::t('Save', 'حفظ');
@endphp
<span class="contents" x-data="nqBookmark(@js($saved), @js((bool) $showLabel))" x-modelable="saved">
    <x-nq::button data-slot="{{ $attributes->get('data-slot', 'bookmark-button') }}" :variant="$variant" :size="$size ?? ($showLabel ? 'md' : 'icon')" :disabled="$disabled" :data-saved="$saved ? '' : null"
        aria-pressed="{{ $saved ? 'true' : 'false' }}" :aria-label="$showLabel ? null : $text" x-bind="button" {{ $attributes->except('data-slot')->cn($saved ? 'text-primary' : '') }}>
        <x-lucide-bookmark aria-hidden="true" x-bind:class="saved ? 'fill-current' : ''" class="{{ $saved ? 'fill-current' : '' }}" />
        @if ($showLabel)<span x-text="text">{{ $text }}</span>@endif
    </x-nq::button>
    <span role="status" x-bind="status" class="sr-only"></span>
</span>

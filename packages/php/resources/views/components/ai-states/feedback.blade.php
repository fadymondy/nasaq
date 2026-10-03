{{-- <x-nq::ai-states.feedback />   <x-nq::ai-states.feedback value="up" />   <x-nq::ai-states.feedback x-model="rating" />
     Thumbs up and down. The chosen one is pressed and "Thanks for the feedback" is announced politely. value: up | down | null (x-modelable: x-model="rating" or wire:model).
     Pressing a thumb sets the value and fires a bubbling "nq-ai-feedback" { value } from the root. labels: words (good, bad, thanks). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.ai-states._logic')
@props(['value' => null, 'labels' => []])
@php($t = nq_ai_words($labels))
<div data-slot="{{ $attributes->get('data-slot', 'ai-feedback') }}" role="group" x-data="nqAiFeedback({!! \Illuminate\Support\Js::from($value) !!})" x-modelable="value" {{ $attributes->except('data-slot')->cn('inline-flex items-center') }}>
    <x-nq::button type="button" variant="ghost" size="icon-sm" data-value="up" aria-label="{{ $t['good'] }}" x-bind:aria-pressed="pressed($el.dataset.value)" x-on:click="rate($el.dataset.value)" class="aria-pressed:text-nq-success-text">
        <x-lucide-thumbs-up aria-hidden="true" />
    </x-nq::button>
    <x-nq::button type="button" variant="ghost" size="icon-sm" data-value="down" aria-label="{{ $t['bad'] }}" x-bind:aria-pressed="pressed($el.dataset.value)" x-on:click="rate($el.dataset.value)" class="aria-pressed:text-nq-danger-text">
        <x-lucide-thumbs-down aria-hidden="true" />
    </x-nq::button>
    <span role="status" class="sr-only" x-text="value ? {{ \Illuminate\Support\Js::from($t['thanks']) }} : ``">{{ $value ? $t['thanks'] : '' }}</span>
</div>

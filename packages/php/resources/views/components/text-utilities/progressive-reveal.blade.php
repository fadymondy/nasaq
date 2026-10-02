{{-- <x-nq::text-utilities.progressive-reveal :collapsed-height="96"> long content </x-nq::text-utilities.progressive-reveal>
     Long content collapsed to a height with a fade and a "Show more" button. The button only appears when the content is taller than the limit.
     collapsed-height in px (default 96). expanded starts open and is x-modelable (x-model / wire:model). Use progressive-list for lists.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['collapsedHeight' => 96, 'expanded' => false])
<div data-slot="{{ $attributes->get('data-slot', 'progressive-reveal') }}" x-data="nqReveal({{ (int) $collapsedHeight }}, @js((bool) $expanded))" x-modelable="expanded" x-bind="root"
    {{ $attributes->except('data-slot')->cn('flex flex-col items-start gap-2') }}>
    <div x-ref="body" x-bind="body" class="w-full overflow-hidden" @unless ($expanded) style="max-height: {{ (int) $collapsedHeight }}px" @endunless>{{ $slot }}</div>
    <x-nq::button variant="ghost" size="sm" x-show="overflows || expanded" x-cloak style="display: none" x-bind="button">
        <x-lucide-chevron-up x-show="expanded" x-cloak style="display: none" aria-hidden="true" />
        <x-lucide-chevron-down x-show="!expanded" aria-hidden="true" />
        <span x-text="label">{{ $expanded ? \Nasaq\Nasaq::t('Show less', 'عرض أقل') : \Nasaq\Nasaq::t('Show more', 'عرض المزيد') }}</span>
    </x-nq::button>
</div>

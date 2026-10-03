{{-- <x-nq::ai-states.split-button label="Summarize" :actions="[['id' => 'translate', 'label' => 'Translate', 'icon' => 'languages'], ['id' => 'fix', 'label' => 'Fix grammar', 'shortcut' => 'Mod Shift G']]" />
     The main AI action with a menu of alternatives. label: the main half (default "Ask AI"). actions: [{ id, label, icon? (a Lucide name), shortcut? ("Mod Shift S", display only), disabled? }].
     generating, disabled, variant (secondary), labels (words: ask, generating, moreActions). Events, bubbling from the root:
       nq-ai-run         the main half was pressed
       nq-ai-action      { id } an action of the menu was chosen
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.ai-states._logic')
@props(['label' => null, 'actions' => [], 'generating' => false, 'disabled' => false, 'variant' => 'secondary', 'labels' => []])
@php($t = nq_ai_words($labels))
<div data-slot="{{ $attributes->get('data-slot', 'ai-split-button') }}" role="group" x-data="nqAiSplit" {{ $attributes->except('data-slot')->cn('inline-flex items-stretch') }}>
    <x-nq::ai-states.sparkle-button :variant="$variant" :generating="$generating" :disabled="$disabled" :labels="$labels" x-on:click="run()" class="rounded-e-none border-e-0">{{ $label }}</x-nq::ai-states.sparkle-button>
    <x-nq::dropdown-menu>
        <x-nq::dropdown-menu.trigger :variant="$variant" size="icon" aria-label="{{ $t['moreActions'] }}" :disabled="$disabled || $generating" class="rounded-s-none">
            <x-lucide-chevron-down aria-hidden="true" />
        </x-nq::dropdown-menu.trigger>
        <x-nq::dropdown-menu.content align="end" class="min-w-56">
            @foreach ($actions as $a)
                <x-nq::dropdown-menu.item :disabled="! empty($a['disabled'])" data-id="{{ $a['id'] }}" x-on:click="pick($el.dataset.id)">
                    @if (! empty($a['icon']))<x-dynamic-component :component="'lucide-'.$a['icon']" aria-hidden="true" />@else<x-lucide-sparkles aria-hidden="true" />@endif
                    {{ $a['label'] }}
                    @if (! empty($a['shortcut']))
                        <x-nq::dropdown-menu.shortcut>
                            <span dir="ltr" x-data="nqAiKeys" class="inline-flex gap-0.5">@foreach (nq_ai_keys($a['shortcut']) as $k)<x-nq::text.kbd :data-key="$k['key']">{{ $k['text'] }}</x-nq::text.kbd>@endforeach</span>
                        </x-nq::dropdown-menu.shortcut>
                    @endif
                </x-nq::dropdown-menu.item>
            @endforeach
        </x-nq::dropdown-menu.content>
    </x-nq::dropdown-menu>
</div>

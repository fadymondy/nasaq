{{-- <x-nq::upgrade-prompt.card title="You are close to your limit" :usage="['value' => 8, 'max' => 10, 'label' => '8 of 10 projects']" href="/billing" />
     The upgrade nudge for the sidebar footer. Inside a collapsed <x-nq::app-shell> sidebar it shrinks to a single icon button with a tooltip.
     title, description. usage: a usage bar so the reason to upgrade is visible: ['value' => 8, 'max' => 10, 'label' => '8 of 10 projects'].
     action-label: the button label (default Upgrade). href makes the button a link; without it, it fires the bubbling `nq-upgrade` event.
     labels: overrides for the built-in strings. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['title' => null, 'description' => null, 'usage' => null, 'actionLabel' => null, 'href' => null, 'labels' => []])
@include('nasaq::components.upgrade-prompt._strings')
@php
    $t = nq_upgrade_labels((array) $labels);
    $label = $actionLabel ?? $t['upgrade'];
    $fire = $href ? 'null' : '$dispatch(`nq-upgrade`)';
@endphp
<div data-slot="upgrade-card-root" x-data="{ get railed() { return !!(this.rail && this.collapsed) } }" class="contents">
    <div x-show="!railed">
        <div data-slot="{{ $attributes->get('data-slot', 'upgrade-card') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3 rounded-card bg-[color-mix(in_oklab,var(--nq-brand)_10%,var(--nq-surface))] p-3 ring-1 ring-nq-brand/20') }}>
            <div class="flex items-start gap-2">
                <x-lucide-sparkles aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-brand" />
                <div class="flex min-w-0 flex-col gap-0.5">
                    <p class="text-label text-foreground">{{ $title }}</p>
                    @if (filled($description))<p class="text-caption text-muted-foreground">{{ $description }}</p>@endif
                </div>
            </div>
            @if (is_array($usage))
                <x-nq::progress.meter :value="($usage['max'] ?? 0) > 0 ? ($usage['value'] ?? 0) / $usage['max'] * 100 : 0" :label="$usage['label'] ?? null" :show-value="! isset($usage['label'])" size="sm" />
            @endif
            <x-nq::button variant="primary" size="sm" :href="$href" x-on:click="{{ $fire }}">{{ $label }}</x-nq::button>
        </div>
    </div>
    <div x-show="railed" style="display: none">
        <x-nq::tooltip side="inline-end">
            <x-slot:tip>{{ $title }}</x-slot:tip>
            <x-nq::button data-slot="upgrade-card" variant="ghost" size="icon" :href="$href" aria-label="{{ $label }}" class="text-nq-brand" x-on:click="{{ $fire }}"><x-lucide-sparkles aria-hidden="true" /></x-nq::button>
        </x-nq::tooltip>
    </div>
</div>

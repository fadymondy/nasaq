{{-- <x-nq::upgrade-prompt.feature-gate :locked="! $isPro" title="Custom reports are on Pro" href="/billing"> ...the feature... </x-nq::upgrade-prompt.feature-gate>
     Wraps a paid feature. Unlocked, it renders the slot as it is. Locked, it shows a blurred preview of it (so people see what they would get) with an upgrade panel on top; the preview is inert and hidden from assistive technology.
     locked: true to lock it. title: "Custom reports are on Pro". description. plan: the plan that unlocks it (default Pro / احترافي). action-label: the button label (default See plans).
     href makes the button a link; without it, it fires the bubbling `nq-upgrade` event. labels: overrides for the built-in strings. Needs the Alpine runtime (@nasaqScripts) when locked. --}}
@props(['locked' => false, 'title' => null, 'description' => null, 'plan' => null, 'actionLabel' => null, 'href' => null, 'labels' => []])
@include('nasaq::components.upgrade-prompt._strings')
@php
    $t = nq_upgrade_labels((array) $labels);
    $fire = $href ? 'null' : '$dispatch(`nq-upgrade`)';
@endphp
@if (! $locked)
{{ $slot }}
@else
<div data-slot="feature-gate" data-locked="" x-data {{ $attributes->cn('relative isolate overflow-hidden rounded-card') }}>
    <div aria-hidden="true" inert class="pointer-events-none select-none blur-[3px] saturate-50">{{ $slot }}</div>
    <div class="absolute inset-0 grid place-items-center bg-background/55 p-4">
        <div class="flex max-w-sm flex-col items-center gap-3 rounded-card bg-card p-5 text-center shadow-lg ring-1 ring-border">
            <span class="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"><x-lucide-lock aria-hidden="true" class="size-4" /></span>
            <x-nq::upgrade-prompt.plan-badge>{{ $plan ?? $t['pro'] }}</x-nq::upgrade-prompt.plan-badge>
            <p class="text-h4 text-foreground">{{ $title }}</p>
            @if (filled($description))<p class="text-body-sm text-muted-foreground">{{ $description }}</p>@endif
            <x-nq::button variant="primary" :href="$href" x-on:click="{{ $fire }}">{{ $actionLabel ?? $t['seePlans'] }}</x-nq::button>
        </div>
    </div>
</div>
@endif

{{-- <x-nq::focus-status.do-not-disturb until="6:00 PM" />   <x-nq::focus-status.do-not-disturb checked x-model="dnd" />
     A switch row for "Do not disturb" with a one-line description. checked is the initial state and x-modelable: x-model and
     wire:model work on it. until: text after "Until", shown while on. disabled disables the switch. Needs the Alpine runtime. --}}
@props(['checked' => false, 'until' => null, 'disabled' => false])
@php
    $checked = (bool) $checked;
    $uid = 'nq-dnd-'.\Illuminate\Support\Str::random(6);
    $t = fn (string $en, string $ar): string => \Nasaq\Nasaq::t($en, $ar);
    $untilText = $until !== null ? $t('Until ', 'حتى ')."\u{2066}".$until."\u{2069}" : null;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'do-not-disturb') }}"
    x-data="{ dnd: {{ $checked ? 'true' : 'false' }} }" x-modelable="dnd" x-bind:data-state="dnd ? 'on' : 'off'"
    {{ $attributes->except('data-slot')->cn('flex items-center justify-between gap-4') }}>
    <div class="flex min-w-0 flex-col gap-0.5">
        <label for="{{ $uid }}" class="inline-flex items-center gap-2 text-label text-foreground">
            <x-lucide-bell-off aria-hidden="true" class="size-4 text-muted-foreground" />
            {{ $t('Do not disturb', 'عدم الإزعاج') }}
        </label>
        <p class="text-body-sm text-muted-foreground">
            {{ $t('Silences notifications and shows you as busy to your team.', 'يكتم الإشعارات ويُظهرك مشغولًا لفريقك.') }}
            @if ($untilText)<span class="ms-1 text-nq-warning-text" x-show="dnd" @unless ($checked) style="display: none" @endunless>{{ $untilText }}</span>@endif
        </p>
    </div>
    <x-nq::switch id="{{ $uid }}" :checked="$checked" :disabled="$disabled" x-model="dnd" />
</div>

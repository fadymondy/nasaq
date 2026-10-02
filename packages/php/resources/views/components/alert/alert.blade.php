{{-- <x-nq::alert tone="danger" title="Sync failed">Could not reach the data source.</x-nq::alert>
     tone: info (default) | success | warning | danger. title: short heading. icon: a lucide name that replaces the tone glyph.
     <x-slot:action> one action at the inline end. dismissible adds a dismiss button that hides the alert (needs the Alpine
     runtime) and fires nq:dismiss. role defaults to alert (warning, danger) or status (info, success). --}}
@props(['tone' => 'info', 'title' => null, 'icon' => null, 'action' => null, 'dismissible' => false, 'dismissLabel' => null, 'role' => null])
@php
    $tones = [
        'info' => 'border-nq-info/30 bg-nq-info-soft',
        'success' => 'border-nq-success/30 bg-nq-success-soft',
        'warning' => 'border-nq-warning/30 bg-nq-warning-soft',
        'danger' => 'border-nq-danger/30 bg-nq-danger-soft',
    ];
    $iconText = ['info' => 'text-nq-info-text', 'success' => 'text-nq-success-text', 'warning' => 'text-nq-warning-text', 'danger' => 'text-nq-danger-text'];
    $glyphs = ['info' => 'circle-dot', 'success' => 'circle-check', 'warning' => 'circle-alert', 'danger' => 'circle-x'];
    $tone = isset($tones[$tone]) ? $tone : 'info';
    $role ??= in_array($tone, ['danger', 'warning'], true) ? 'alert' : 'status';
    $hasTitle = filled($title);
    $hasBody = isset($slot) && ! $slot->isEmpty();
    $hasAction = $action && ! $action->isEmpty();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'alert') }}" data-tone="{{ $tone }}" role="{{ $role }}"
    @if ($dismissible) x-data="nqAlert()" x-modelable="open" x-show="open" @endif
    {{ $attributes->except('data-slot')->cn(['relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border p-3 text-start', $tones[$tone]]) }}>
    <x-dynamic-component :component="'lucide-'.($icon ?? $glyphs[$tone])" aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 {{ $iconText[$tone] }}" />
    <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5">
        @if ($hasTitle)
            <div data-slot="alert-title" class="text-label text-foreground">{{ $title }}</div>
        @endif
        @if ($hasBody)
            <div data-slot="alert-description" class="text-body-sm {{ $hasTitle ? 'text-muted-foreground' : 'text-foreground' }}">{{ $slot }}</div>
        @endif
    </div>
    @if ($hasAction || $dismissible)
        <div data-slot="alert-actions" class="ms-3 flex items-center gap-1">
            {{ $action }}
            @if ($dismissible)
                <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $dismissLabel ?? \Nasaq\Nasaq::t('Dismiss', 'تجاهل') }}" x-on:click="dismiss()" class="text-muted-foreground [&_svg]:size-3.5"><x-lucide-x aria-hidden="true" /></x-nq::button>
            @endif
        </div>
    @endif
</div>

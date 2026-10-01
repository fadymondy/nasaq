{{-- <x-nq.alert tone="warning" title="Payment overdue">Invoice #1042 is 5 days late.</x-nq.alert>
     tone: info | success | warning | danger. Optional <x-slot:icon> (an inline 16px SVG). --}}
@props(['tone' => 'info', 'title' => null])
<div {{ $attributes->merge(['class' => 'nq-alert', 'data-tone' => $tone, 'role' => $tone === 'danger' ? 'alert' : 'status']) }}>
    {{ $icon ?? '' }}
    <div>
        @if ($title)<p class="nq-alert-title">{{ $title }}</p>@endif
        @if (trim((string) $slot) !== '')<div class="nq-alert-description">{{ $slot }}</div>@endif
    </div>
</div>

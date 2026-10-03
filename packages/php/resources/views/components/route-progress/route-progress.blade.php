{{-- <x-nq::route-progress :active="$loading" />   <x-nq::route-progress :value="40" tone="success" placement="absolute" />
     A thin bar along the top edge. tone: default | info | success | warning | danger.
     placement: fixed (top of the screen) | absolute (top of a relative parent). interval: ms between creeps.
     Drive it with x-model / $data active, pin it with value (0 to 100), or let jobs share it:
     window.dispatchEvent(new CustomEvent('nq-progress-start')) and 'nq-progress-end'.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['active' => false, 'value' => null, 'tone' => 'default', 'placement' => 'fixed', 'interval' => 250, 'label' => null])
@php
    $tones = [
        'default' => 'bg-primary',
        'info' => 'bg-nq-info',
        'success' => 'bg-nq-success',
        'warning' => 'bg-nq-warning',
        'danger' => 'bg-nq-danger',
    ];
    $pinned = $value !== null;
    $shown = $pinned ? max(0, min(100, (float) $value)) : ($active ? 6 : 0);
    $show = $pinned ? $shown > 0 && $shown < 100 : (bool) $active;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'route-progress') }}" data-state="{{ $show ? 'active' : 'idle' }}"
    x-data="nqRouteProgress(@js((bool) $active), @js($pinned ? (float) $value : null), @js((int) $interval))" x-bind="root"
    role="progressbar" aria-label="{{ $label ?? \Nasaq\Nasaq::t('Loading', 'جارٍ التحميل') }}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ (int) round($shown) }}"
    @unless ($show) aria-hidden="true" @endunless
    {{ $attributes->except('data-slot')->cn([
        'pointer-events-none inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200 ease-nq motion-reduce:transition-none',
        $placement === 'absolute' ? 'absolute' : 'fixed',
        $show ? 'opacity-100' : 'opacity-0',
    ]) }}>
    <div data-slot="route-progress-bar" x-bind="bar" style="inline-size: {{ $shown }}%"
        class="h-full rounded-e-full transition-[inline-size] duration-200 ease-nq motion-reduce:transition-none {{ $tones[$tone] ?? $tones['default'] }}"></div>
</div>

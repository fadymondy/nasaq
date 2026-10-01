{{-- <x-nq::extension-popup status="connected" :pausable="true" :options="true"> <x-slot:brand><span dir="ltr">Nasaq</span></x-slot:brand> body <x-slot:footer>v1.4.0</x-slot:footer> </x-nq::extension-popup>
     The frame of a browser extension popup: 22rem wide, a header with the brand, a status badge and a pause switch, a scrolling body and a footer with the options link.
     status: connected | disconnected | error. paused: starts paused (it is x-modelable). pausable shows the pause switch; options shows the Options button.
     Pausing dispatches a bubbling "nq-pause-change" event with detail { paused }; Options dispatches "nq-open-options".
     Slots: brand (keep the Latin name dir="ltr"), the body, footer (version text). labels: override any string (connected, disconnected, paused, error, pause, pauseHint, options).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['status' => 'connected', 'paused' => false, 'pausable' => false, 'options' => false, 'labels' => [], 'brand' => null, 'footer' => null])
@php
    use Nasaq\Nasaq;

    $paused = (bool) $paused;
    $t = array_merge([
        'connected' => Nasaq::t('Connected', 'متصل'),
        'disconnected' => Nasaq::t('Not connected', 'غير متصل'),
        'paused' => Nasaq::t('Paused', 'متوقف مؤقتًا'),
        'error' => Nasaq::t('Problem', 'مشكلة'),
        'pause' => Nasaq::t('Pause', 'إيقاف مؤقت'),
        'pauseHint' => Nasaq::t('Stops the extension on every site until you turn it back on.', 'يوقف الإضافة على كل المواقع حتى تعيد تشغيلها.'),
        'options' => Nasaq::t('Options', 'الخيارات'),
    ], (array) $labels);
    $tone = ['connected' => 'success', 'disconnected' => 'neutral', 'error' => 'danger'];
    $status = array_key_exists($status, $tone) ? $status : 'connected';
@endphp
<div data-slot="extension-popup" x-data="nqExtensionPopup(@js(['paused' => $paused, 'status' => $status]))" x-modelable="paused" x-bind:data-state="state()" data-state="{{ $paused ? 'paused' : $status }}"
    {{ $attributes->cn('flex max-h-[37.5rem] w-[22rem] max-w-full flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-lg') }}>
    <header class="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span class="flex min-w-0 flex-1 items-center gap-2 text-label font-semibold">{{ $brand }}</span>
        <span x-show="paused" @unless ($paused) style="display: none" @endunless><x-nq::badge variant="warning">{{ $t['paused'] }}</x-nq::badge></span>
        <span x-show="!paused" @if ($paused) style="display: none" @endif><x-nq::badge :variant="$tone[$status]">{{ $t[$status] }}</x-nq::badge></span>
        @if ($pausable)
            <span class="flex items-center gap-1.5">
                <span x-show="paused" aria-hidden="true" class="text-nq-warning-text [&_svg]:size-3.5" @unless ($paused) style="display: none" @endunless><x-lucide-pause /></span>
                <span x-show="!paused" aria-hidden="true" class="text-muted-foreground [&_svg]:size-3.5" @if ($paused) style="display: none" @endif><x-lucide-play /></span>
                <x-nq::switch :checked="$paused" x-model="paused" aria-label="{{ $t['pause'] }}" title="{{ $t['pauseHint'] }}" />
            </span>
        @endif
    </header>
    <div data-slot="extension-popup-body" class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {{ $slot }}
    </div>
    @if ($options || ($footer && ! $footer->isEmpty()))
        <footer class="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-caption text-muted-foreground">
            @if ($options)
                <x-nq::button variant="ghost" size="sm" x-on:click="$dispatch('nq-open-options')"><x-lucide-settings aria-hidden="true" />{{ $t['options'] }}</x-nq::button>
            @else
                <span></span>
            @endif
            <span>{{ $footer }}</span>
        </footer>
    @endif
</div>

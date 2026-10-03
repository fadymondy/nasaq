{{-- <x-nq::countdown.idle-time-prompt :threshold-ms="300000" discard-and-stop @idle-discard="…" />
     "You were away for N min. Keep it or discard it?" An alert dialog that opens when the person comes back after threshold-ms without input
     (a laptop that slept). Only its buttons answer it. Events from the wrapper: idle-keep, idle-discard, idle-discard-stop (detail: { idleMs, since }).
     discard-and-stop adds the third button. disabled stops watching (set it while nothing runs). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['thresholdMs' => 300000, 'discardAndStop' => false, 'disabled' => false])
<div data-slot="idle-time-prompt-root" x-data="nqIdleTime({{ (int) $thresholdMs }}, {!! \Illuminate\Support\Js::from(['disabled' => (bool) $disabled]) !!})" {{ $attributes->cn('contents') }}>
    <x-nq::alert-dialog x-model="away">
        <x-nq::alert-dialog.content>
            <x-nq::alert-dialog.header>
                <x-nq::alert-dialog.title class="inline-flex items-center gap-2">
                    <x-lucide-timer-off aria-hidden="true" class="size-5 text-nq-warning-text" />
                    {{ \Nasaq\Nasaq::t('You were away', 'كنت بعيدًا') }}
                </x-nq::alert-dialog.title>
                <x-nq::alert-dialog.description><span x-text="description()"></span></x-nq::alert-dialog.description>
            </x-nq::alert-dialog.header>
            <x-nq::alert-dialog.footer>
                @if ($discardAndStop)
                    <x-nq::button variant="ghost" x-on:click="discardAndStop()">{{ \Nasaq\Nasaq::t('Discard and stop', 'احذف وأوقف') }}</x-nq::button>
                @endif
                <x-nq::button variant="secondary" x-on:click="discard()"><span x-text="discardLabel()"></span></x-nq::button>
                <x-nq::button variant="primary" x-on:click="keep()">
                    <x-lucide-coffee aria-hidden="true" />
                    {{ \Nasaq\Nasaq::t('Keep the time', 'احتفظ بالوقت') }}
                </x-nq::button>
            </x-nq::alert-dialog.footer>
        </x-nq::alert-dialog.content>
    </x-nq::alert-dialog>
</div>

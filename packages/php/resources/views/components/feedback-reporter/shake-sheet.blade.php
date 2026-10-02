{{-- <x-nq::feedback-reporter.shake-sheet setting x-on:nq-report="openDialog()" x-on:nq-shake-enabled="save($event.detail.enabled)" />
     The bottom sheet that answers a shake of the phone: "Something wrong? Report a problem", with a way to turn shaking off. It listens to devicemotion itself; a person
     who shakes the phone sees the sheet. Open it by hand with window.dispatchEvent(new CustomEvent('nq-shake-open')).
     enabled (default true): listen for shakes. setting (default false): show the "Shake to report" switch. threshold (18, m/s² between two readings), jolts (3), cooldown (3000 ms).
     labels: array overrides, by key (shakeTitle, shakeDescription, shakeReport, shakeDismiss, shakeSetting, shakeSettingHint).
     Events bubbling from the root: nq-report (the person chose to report), nq-shake-enabled (detail.enabled, when the switch changes). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['enabled' => true, 'setting' => false, 'threshold' => 18, 'jolts' => 3, 'cooldown' => 3000, 'labels' => []])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $config = ['enabled' => (bool) $enabled, 'threshold' => $threshold, 'jolts' => $jolts, 'cooldown' => $cooldown];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'shake-report') }}" x-data="nqShakeReport(@js($config))" x-on:nq-shake-open.window="show()" {{ $attributes->except('data-slot')->cn('contents') }}>
    <x-nq::sheet x-model="shown">
        <x-nq::sheet.content side="bottom" class="pb-[env(safe-area-inset-bottom)]">
            <div data-slot="shake-report-sheet" class="flex flex-col">
                <x-nq::sheet.header class="items-start">
                    <span aria-hidden="true" class="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-secondary"><x-lucide-vibrate class="size-5" /></span>
                    <x-nq::sheet.title class="text-h3">{{ $L('shakeTitle', 'Something wrong?', 'هل من مشكلة؟') }}</x-nq::sheet.title>
                    <x-nq::sheet.description class="text-body-sm">{{ $L('shakeDescription', 'You shook your phone. Do you want to report a problem on this screen?', 'هززت هاتفك. هل تريد الإبلاغ عن مشكلة في هذه الشاشة؟') }}</x-nq::sheet.description>
                </x-nq::sheet.header>
                <div class="flex flex-col gap-3 p-4">
                    <x-nq::button variant="primary" size="lg" x-on:click="report()"><x-lucide-bug aria-hidden="true" />{{ $L('shakeReport', 'Report a problem', 'الإبلاغ عن مشكلة') }}</x-nq::button>
                    <x-nq::button variant="ghost" x-on:click="shown = false">{{ $L('shakeDismiss', 'Not now', 'ليس الآن') }}</x-nq::button>
                    @if ($setting)
                        <div class="mt-1 flex items-center justify-between gap-4 border-t border-border pt-3">
                            <div class="flex flex-col">
                                <span class="text-label">{{ $L('shakeSetting', 'Shake to report', 'الهز للإبلاغ') }}</span>
                                <span class="text-caption text-muted-foreground">{{ $L('shakeSettingHint', 'Shaking your phone opens this sheet.', 'هز هاتفك يفتح هذه الورقة.') }}</span>
                            </div>
                            <x-nq::switch :checked="(bool) $enabled" x-model="enabled" aria-label="{{ $L('shakeSetting', 'Shake to report', 'الهز للإبلاغ') }}" />
                        </div>
                    @endif
                </div>
            </div>
        </x-nq::sheet.content>
    </x-nq::sheet>
</div>

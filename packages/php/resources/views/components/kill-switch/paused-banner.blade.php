{{-- <x-nq::kill-switch.paused-banner :paused="['by' => 'Sara Ali', 'at' => '2026-03-01T09:30:00Z', 'reason' => 'Bad deploy']" can-resume />
     The bar that tells everyone the emergency stop is on; put it above every page while paused. A status region, pinned to the top.
     paused: ['by' => ..., 'at' => ..., 'reason' => ...]. can-resume shows a Resume button. sticky (default true). hint replaces the hint sentence.
     labels: array overriding the words. The Resume button fires a bubbling, cancelable "nq-kill-switch-resume" event with detail
     { resolve(result?), reject(message), waitUntil(promise) }: @nq-kill-switch-resume="$event.detail.waitUntil($wire.resume())".
     It stays busy until you answer; resolve({ error }) / reject(message) / a rejected promise shows the failure. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.kill-switch._kill-switch')
@props(['paused', 'canResume' => false, 'sticky' => true, 'hint' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_kill_switch_strings($locale, $labels);
@endphp
{{-- gap-x-3 + gap-y-1: Cn::merge treats gap-x/gap-y as the same group as gap, so class() is used instead of cn(). --}}
<div role="status" data-slot="paused-banner" x-data="nqKillSwitchAction(@js(['failed' => $t['failed']]))"
    {{ $attributes->class(['flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-nq-danger-soft px-4 py-2 text-body-sm text-nq-danger-text', 'sticky top-0 z-40' => $sticky]) }}>
    <x-lucide-circle-pause aria-hidden="true" class="size-4 shrink-0" />
    <span class="min-w-0 flex-1">
        <span class="font-medium">{{ $t['bannerTitle'] }}.</span> <span class="opacity-80">{{ $hint ?? $t['bannerHint'] }}</span>
        <span class="opacity-80">{{ str_replace('{who}', $paused['by'] ?? '', $t['pausedBy']) }}, <x-nq::numeric.date-time :value="$paused['at']" relative />. {{ $paused['reason'] ?? '' }}</span>
        <span role="alert" x-show="error" x-text="error" x-cloak style="display: none" class="ms-2 font-medium"></span>
    </span>
    @if ($canResume)
        <x-nq::button size="sm" variant="secondary" x-bind="actionButton">
            <x-nq::spinner x-show="busy" x-cloak style="display: none" />
            <span x-show="!busy">{{ $t['bannerResume'] }}</span>
            <span x-show="busy" x-cloak style="display: none">{{ $t['bannerResuming'] }}</span>
        </x-nq::button>
    @endif
</div>

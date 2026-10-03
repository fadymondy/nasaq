{{-- <x-nq::impersonation-banner :as="['name' => 'Sara Ali', 'email' => 'sara@example.com']" exit-url="/impersonate/stop" />
     A bar that says "you are viewing as X" with an exit button; a status region, pinned to the top.
     as: ['name' => ..., 'email' => ...]. mode: impersonate | preview. started-at: shown as a relative time. sticky (default true).
     hint replaces the hint sentence. exit-url: where the exit button goes (location). Without it, listen for the event:
     @exit="$event.detail.wait(fetch('/stop', { method: 'POST' }))" . Reject the promise to keep the banner and show the failure.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['as', 'mode' => 'impersonate', 'startedAt' => null, 'sticky' => true, 'hint' => null, 'exitUrl' => null])
@php
    $preview = $mode === 'preview';
    $name = $as['name'] ?? '';
    $email = $as['email'] ?? null;
    $t = \Nasaq\Nasaq::class;
@endphp
{{-- gap-x-3 + gap-y-1: Cn::merge treats gap-x/gap-y as the same group as gap (shared Cn.php), so class() is used instead of cn(). --}}
<div role="status" data-slot="{{ $attributes->get('data-slot', 'impersonation-banner') }}" data-mode="{{ $mode }}" x-data="nqImpersonationBanner(@js($exitUrl))"
    {{ $attributes->except('data-slot')->class(['flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-body-sm', $preview ? 'bg-nq-info-soft text-nq-info-text' : 'bg-nq-warning-soft text-nq-warning-text', 'sticky top-0 z-40' => $sticky]) }}>
    @if ($preview)<x-lucide-eye aria-hidden="true" class="size-4 shrink-0" />@else<x-lucide-shield-user aria-hidden="true" class="size-4 shrink-0" />@endif
    <span class="min-w-0 flex-1">
        <span class="font-medium">{{ $preview ? $t::t("Previewing as {$name}.", "معاينة بصفة {$name}.") : $t::t("You are viewing the app as {$name}.", "أنت تتصفح التطبيق بصفة {$name}.") }}</span>
        @if ($email)<bdi dir="ltr" class="opacity-80">{{ $email }}</bdi>@endif
        <span class="opacity-80">{{ $hint ?? ($preview ? $t::t('Nothing you do here is saved.', 'لا يُحفظ أي شيء تفعله هنا.') : $t::t('Actions you take count as this user.', 'الإجراءات التي تنفذها تُنسب إلى هذا المستخدم.')) }}</span>
        @if ($startedAt !== null)<span class="ms-2 opacity-80">{{ $t::t('Since', 'منذ') }} <x-nq::numeric.date-time :value="$startedAt" relative /></span>@endif
        <span role="alert" x-show="failed" x-cloak style="display: none" class="ms-2 font-medium">{{ $t::t('Could not exit. Try again.', 'تعذّر الخروج. حاول مرة أخرى.') }}</span>
    </span>
    <x-nq::button size="sm" variant="secondary" x-bind="exitButton">
        <x-nq::spinner x-show="busy" x-cloak style="display: none" />
        <span x-show="!busy">{{ $preview ? $t::t('Exit preview', 'إنهاء المعاينة') : $t::t('Exit impersonation', 'إنهاء انتحال الصفة') }}</span>
        <span x-show="busy" x-cloak style="display: none">{{ $t::t('Exiting…', 'جارٍ الخروج…') }}</span>
    </x-nq::button>
</div>

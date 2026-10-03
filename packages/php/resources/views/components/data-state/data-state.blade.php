{{-- Usage: x-nq::data-state with :loading, :unauthorized, :unavailable, :error, :empty and sign-in-href="/login" props;
     put the content in the slot and a "New order" button in the emptyAction named slot.
     Renders exactly one state of a data view, in a fixed order: loading, unauthorized (401), unavailable (503), error, empty,
     then the content (the slot). A page never shows a raw error string or a blank area.
     error: a message or an Exception. retry: the attributes of the "Try again" button on the 503 and error cards, e.g.
     :retry="['wire:click' => 'load']" (none: no button). sign-in-href: where "Sign in" goes in the 401 card.
     empty-icon (lucide name), loading-rows (3), labels (unauthorizedTitle, unauthorizedBody, signIn, unavailableTitle,
     unavailableBody, retry, errorTitle, emptyTitle, emptyBody). Slots: emptyAction, loading (replaces the skeleton). --}}
@props(['loading' => false, 'unauthorized' => false, 'unavailable' => false, 'error' => null, 'empty' => false, 'signInHref' => null, 'signIn' => null, 'retry' => null, 'emptyIcon' => 'inbox', 'loadingRows' => 3, 'labels' => [], 'emptyAction' => null, 'loadingFallback' => null])
@php
    $t = array_merge([
        'unauthorizedTitle' => \Nasaq\Nasaq::t('Your session has ended', 'انتهت جلستك'),
        'unauthorizedBody' => \Nasaq\Nasaq::t('Sign in again to see this page.', 'سجّل الدخول مرة أخرى لعرض هذه الصفحة.'),
        'signIn' => \Nasaq\Nasaq::t('Sign in', 'تسجيل الدخول'),
        'unavailableTitle' => \Nasaq\Nasaq::t('This service is not available right now', 'هذه الخدمة غير متاحة الآن'),
        'unavailableBody' => \Nasaq\Nasaq::t('It may be starting up or under maintenance. Try again in a moment.', 'قد تكون قيد التشغيل أو الصيانة. حاول مرة أخرى بعد قليل.'),
        'retry' => \Nasaq\Nasaq::t('Try again', 'حاول مرة أخرى'),
        'errorTitle' => \Nasaq\Nasaq::t('Something went wrong', 'حدث خطأ ما'),
        'emptyTitle' => \Nasaq\Nasaq::t('Nothing here yet', 'لا يوجد شيء هنا بعد'),
        'emptyBody' => '',
    ], $labels);
    $detail = match (true) {
        ! $error => null,
        is_string($error) => $error,
        $error instanceof \Throwable => $error->getMessage(),
        default => (string) json_encode($error),
    };
    $hasFallback = $loadingFallback && ! $loadingFallback->isEmpty();
    $hasEmptyAction = $emptyAction && ! $emptyAction->isEmpty();
    $retryAttrs = is_array($retry) ? $retry : null;
    $retryBag = new \Illuminate\View\ComponentAttributeBag($retryAttrs ?? []);
    $signInBag = new \Illuminate\View\ComponentAttributeBag((array) $signIn);
@endphp
@if ($loading)
    @if ($hasFallback)
        {{ $loadingFallback }}
    @else
        <x-nq::states.loading :rows="$loadingRows" {{ $attributes }} />
    @endif
@elseif ($unauthorized)
    <x-nq::states kind="data-state" data-state="unauthorized" icon="log-in" :title="$t['unauthorizedTitle']" :description="$t['unauthorizedBody']" {{ $attributes }}>
        @if ($signIn || $signInHref)
            <x-slot:actions>
                <x-nq::button size="sm" variant="primary" :href="$signIn ? null : $signInHref" :attributes="$signInBag"><x-lucide-log-in aria-hidden="true" /> {{ $t['signIn'] }}</x-nq::button>
            </x-slot:actions>
        @endif
    </x-nq::states>
@elseif ($unavailable)
    <x-nq::data-state.service-unavailable data-state="unavailable" :retry="$retryAttrs" :labels="$labels" {{ $attributes }} />
@elseif ($detail !== null)
    <x-nq::states.error data-state="error" :title="$t['errorTitle']" :description="$detail" {{ $attributes }}>
        @if ($retryAttrs !== null)
            <x-slot:actions><x-nq::button size="sm" :attributes="$retryBag">{{ $t['retry'] }}</x-nq::button></x-slot:actions>
        @endif
    </x-nq::states.error>
@elseif ($empty)
    <x-nq::states.empty data-state="empty" :icon="$emptyIcon" :title="$t['emptyTitle']" :description="$t['emptyBody'] ?: null" {{ $attributes }}>
        @if ($hasEmptyAction)
            <x-slot:actions>{{ $emptyAction }}</x-slot:actions>
        @endif
    </x-nq::states.empty>
@else
    {{ $slot }}
@endif

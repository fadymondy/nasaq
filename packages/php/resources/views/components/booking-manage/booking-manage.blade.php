{{-- <x-nq::booking-manage :booking="$booking" :policy="['cancelHours' => 24, 'lateFeePercent' => 50]" :slots="$slots" />
     A patient's own booking page: the ticket plus reschedule and cancel. The buttons follow the policy: reschedule closes some hours before the
     visit, cancelling late may cost a fee and the dialog says how much before the patient confirms.
     booking: see x-nq::booking-manage.ticket. policy: ['cancelHours', 'rescheduleHours'?, 'lateFeePercent'?].
     slots: the times the patient can move to, [['start' => '2030-01-11T09:00', 'state' => 'available'], ...] (see x-nq::booking-slots); loading shows skeleton times.
     now: pins "now" (for tests and docs). labels: override any string.
     Bubbling events: "reschedule" { start, fail(message) } and "cancel-booking" { fail(message) }. The page updates at once; call fail to put it back and show the message.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['booking', 'policy', 'slots' => [], 'loading' => false, 'now' => null, 'labels' => [], 'locale' => null])
@include('nasaq::components.booking-manage._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_bm_words($locale, (array) $labels);
    $b = (array) $booking;
    $policy = (array) $policy;
    $nowDate = $now ? \Carbon\CarbonImmutable::parse($now) : \Carbon\CarbonImmutable::now();
    $rule = nq_bm_policy($b['start'], $nowDate, $policy, $b['status']);
    $cancelled = $b['status'] === 'cancelled';
    $policyText = $rule['canCancel']
        ? ($rule['freeCancel'] ? nq_bm_fill($t['freeCancel'], $policy['cancelHours']) : ($rule['feePercent'] > 0 ? nq_bm_fill($t['lateFee'], $rule['feePercent']) : $t['lateNoFee']))
        : ($cancelled ? $t['cancelledNote'] : $t['tooLate']);
    $extra = $rule['canCancel'] && ! $rule['canReschedule'] ? ' '.nq_bm_fill($t['noReschedule'], $policy['rescheduleHours'] ?? $policy['cancelHours']) : '';
    $options = array_filter([
        'start' => \Carbon\CarbonImmutable::parse($b['start'])->format('Y-m-d\TH:i'),
        'failed' => $t['failed'],
    ], fn ($v) => $v !== null);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'booking-manage') }}" x-data="nqBookingManage({!! \Illuminate\Support\Js::from($b['status'])->toHtml() !!}, {!! \Illuminate\Support\Js::from((object) $options)->toHtml() !!})"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <x-nq::alert tone="danger" x-show="status === 'cancelled'" :style="$cancelled ? null : 'display: none'">{{ $t['cancelledNote'] }}</x-nq::alert>
    <x-nq::booking-manage.ticket :booking="$b" :labels="$labels" :locale="$locale" :hide-calendar="$cancelled" calendar-show="status !== 'cancelled'" x-bind:data-status="status">
        <x-slot:badge>
            <x-nq::booking-pipeline.status-badge :status="$b['status']" x-show="status !== 'cancelled'" :style="$cancelled ? 'display: none' : null" />
            <x-nq::booking-pipeline.status-badge status="cancelled" x-show="status === 'cancelled'" :style="$cancelled ? null : 'display: none'" />
        </x-slot:badge>
        @if ($rule['canReschedule'])
            <x-nq::button variant="secondary" size="sm" x-show="status !== 'cancelled'" x-on:click="openDialog()"><x-lucide-calendar-clock aria-hidden="true" />{{ $t['reschedule'] }}</x-nq::button>
        @endif
        @if ($rule['canCancel'])
            <span class="contents" x-show="status !== 'cancelled'">
                <x-nq::alert-dialog.confirm-button size="sm" variant="danger" :title="$t['cancelTitle']" :description="$policyText" :confirm-label="$t['cancelConfirm']" x-on:click="cancel()">{{ $t['cancel'] }}</x-nq::alert-dialog.confirm-button>
            </span>
        @endif
    </x-nq::booking-manage.ticket>
    <p class="text-caption text-muted-foreground" data-slot="booking-policy" x-show="status !== 'cancelled'" @if ($cancelled) style="display: none" @endif>{{ $policyText }}{{ $extra }}</p>
    <p class="text-caption text-muted-foreground" data-slot="booking-policy" x-show="status === 'cancelled'" @unless ($cancelled) style="display: none" @endunless>{{ $t['cancelledNote'] }}</p>
    <p role="alert" x-show="error && !open" x-cloak style="display: none" class="text-caption text-nq-danger-text" x-text="error"></p>

    <x-nq::dialog x-model="open">
        <x-nq::dialog.content class="max-w-3xl">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $t['rescheduleTitle'] }}</x-nq::dialog.title>
                <x-nq::dialog.description>{{ $t['rescheduleText'] }}</x-nq::dialog.description>
            </x-nq::dialog.header>
            <x-nq::booking-slots x-model="choice" :slots="$slots" :loading="$loading" :now="$nowDate->format('Y-m-d\TH:i')" :default-day="\Carbon\CarbonImmutable::parse($b['start'])->format('Y-m-d')" :locale="$locale" />
            <p role="alert" x-show="error" x-cloak style="display: none" class="text-caption text-nq-danger-text" x-text="error"></p>
            <x-nq::dialog.footer>
                <x-nq::button variant="ghost" x-on:click="open = false">{{ $t['close'] }}</x-nq::button>
                <x-nq::button variant="primary" x-bind:disabled="!choice" x-on:click="move()">{{ $t['confirmMove'] }}</x-nq::button>
            </x-nq::dialog.footer>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>

{{-- <x-nq::local-payments.verification-status status="verifying" method-name="InstaPay" reference="AB12CD34" :submitted-at="$at" />
     Where a manual payment stands: receipt sent, under review, verified. A rejection shows the reason and, with `resubmit`, a button that fires the
     bubbling "nq-payment-resubmit" event.
     status: unpaid | submitted | verifying | verified | rejected. method-name, reference, submitted-at (DateTime, timestamp or string), rejection-reason,
     labels: array overriding any built-in text. Static markup: needs no Alpine runtime except for the resubmit button. --}}
@include('nasaq::components.local-payments._logic')
@props(['status' => 'unpaid', 'methodName' => null, 'reference' => null, 'submittedAt' => null, 'rejectionReason' => null, 'resubmit' => false, 'labels' => []])
@php
    $t = nq_payments_words(app()->getLocale(), (array) $labels);
    $step = match ($status) { 'submitted' => 0, 'verifying', 'rejected' => 1, 'verified' => 2, default => -1 };
    $rejected = $status === 'rejected';
    $stages = [];
    foreach (['submitted', 'verifying', 'verified'] as $i => $stage) {
        $done = $step > $i || ($status === 'verified' && $i === 2);
        $current = $step === $i && ! $done;
        $bad = $rejected && $i === 1;
        $stages[] = ['stage' => $stage, 'i' => $i, 'done' => $done, 'current' => $current, 'bad' => $bad, 'state' => $bad ? 'rejected' : ($done ? 'done' : ($current ? 'current' : 'todo'))];
    }
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'payment-verification-status') }}" data-status="{{ $status }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-4') }}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="flex items-center gap-2 text-label text-foreground">
            <x-lucide-shield-check aria-hidden="true" class="size-4 text-muted-foreground" />
            {{ $t['verification'] }}
        </h3>
        <x-nq::status :tone="nq_payments_tone($status)">{{ $t['statuses'][$status] ?? $status }}</x-nq::status>
    </div>
    <ol class="flex flex-col gap-3" aria-label="{{ $t['verification'] }}">
        @foreach ($stages as $s)
            <li data-state="{{ $s['state'] }}" @if ($s['current']) aria-current="step" @endif class="flex items-start gap-3">
                <span aria-hidden="true"
                    class="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-caption [&_svg]:size-3.5 {{ $s['bad'] ? 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text' : ($s['done'] ? 'border-nq-success/40 bg-nq-success-soft text-nq-success-text' : ($s['current'] ? 'border-primary text-foreground' : 'border-border text-muted-foreground')) }}">
                    @if ($s['bad'])<x-lucide-x />@elseif ($s['done'])<x-lucide-check />@elseif ($s['current'])<x-lucide-clock />@else{{ $s['i'] + 1 }}@endif
                </span>
                <span class="flex min-w-0 flex-col">
                    <span class="text-body-sm {{ $s['done'] || $s['current'] || $s['bad'] ? 'text-foreground' : 'text-muted-foreground' }}">{{ $t['stages'][$s['stage']] }}</span>
                    @if (($s['done'] || $s['current']) && ! $s['bad'])<span class="text-caption text-muted-foreground">{{ $t['stageHelp'][$s['stage']] }}</span>@endif
                </span>
            </li>
        @endforeach
    </ol>
    @if ($methodName || $reference || $submittedAt)
        <p class="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
            @if ($methodName)<span>{{ nq_payments_say($t['viaMethod'], ['name' => $methodName]) }}</span>@endif
            @if ($reference)<bdi dir="ltr" class="font-mono">{{ $reference }}</bdi>@endif
            @if ($submittedAt)<span>{{ $t['submittedAt'] }} <x-nq::numeric.date-time :value="$submittedAt" date-style="medium" time-style="short" /></span>@endif
        </p>
    @endif
    @if ($rejected)
        <div role="alert" class="flex flex-col gap-2 rounded-card border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm">
            <p class="flex items-center gap-2 font-medium text-nq-danger-text">
                <x-lucide-circle-x aria-hidden="true" class="size-4" />
                {{ $t['rejectedTitle'] }}
            </p>
            @if ($rejectionReason)<p class="text-foreground">{{ $rejectionReason }}</p>@endif
            <p class="text-muted-foreground">{{ $t['rejectedHelp'] }}</p>
            @if ($resubmit)<x-nq::button size="sm" type="button" class="self-start" x-on:click="$el.dispatchEvent(new CustomEvent('nq-payment-resubmit', { bubbles: true }))">{{ $t['resubmit'] }}</x-nq::button>@endif
        </div>
    @endif
</div>

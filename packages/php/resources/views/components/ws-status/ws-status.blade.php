{{-- <x-nq::ws-status state="connected" :latency-ms="42" />   <x-nq::ws-status state="reconnecting" variant="banner" :retry-at="now()->addSeconds(7)" retryable />
     The state of a realtime connection (WebSocket, SSE): live with its latency, connecting, reconnecting with a countdown,
     or offline with Retry now. variant: badge (default) | inline | banner. It is presentational: your socket code drives it.
     state: connected | connecting | reconnecting | offline. latency-ms, retry-at (DateTime, timestamp or string), attempt,
     last-connected-at (banner), show-latency (default true), retryable shows the Retry now button.
     Drive it live from your socket code: $dispatch('nq-ws-status', { state: 'offline' }) on the element, or x-model the state.
     Retry fires a "retry" event: @retry="$event.detail.wait(reconnect())". Needs the Alpine runtime (@nasaqScripts). --}}
@props(['state' => 'connected', 'latencyMs' => null, 'retryAt' => null, 'attempt' => null, 'lastConnectedAt' => null, 'variant' => 'badge', 'showLatency' => true, 'retryable' => false])
@php
    $t = \Nasaq\Nasaq::class;
    $states = [
        'connected' => [$t::t('Live', 'مباشر'), $t::t('Live updates are on.', 'التحديثات المباشرة مفعّلة.')],
        'connecting' => [$t::t('Connecting', 'جارٍ الاتصال'), $t::t('Opening the live connection.', 'جارٍ فتح الاتصال المباشر.')],
        'reconnecting' => [$t::t('Reconnecting', 'إعادة الاتصال'), $t::t('The live connection dropped. Trying again.', 'انقطع الاتصال المباشر. جارٍ المحاولة مجددًا.')],
        'offline' => [$t::t('Offline', 'غير متصل'), $t::t('You are offline. Live updates are paused.', 'أنت غير متصل. التحديثات المباشرة متوقفة.')],
    ];
    $toMs = fn ($v) => $v === null ? null : (int) ($v instanceof \DateTimeInterface ? $v->getTimestamp() * 1000 : (is_numeric($v) ? ($v < 1e11 ? $v * 1000 : $v) : strtotime((string) $v) * 1000));
    $retryMs = $toMs($retryAt);
    $lastMs = $toMs($lastConnectedAt);
    $seconds = $retryMs === null ? null : max(0, (int) ceil(($retryMs - microtime(true) * 1000) / 1000));
    $countdown = $seconds === null ? '' : ($seconds > 0 ? $t::t('Retrying in '.intdiv($seconds, 60).':'.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT), 'إعادة المحاولة بعد '.intdiv($seconds, 60).':'.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT)) : $t::t('Retrying now', 'جارٍ المحاولة الآن'));
    $hasLatency = $showLatency && $state === 'connected' && $latencyMs !== null;
    $canRetry = $retryable && in_array($state, ['reconnecting', 'offline'], true);
    $hide = fn (bool $visible) => $visible ? '' : 'style="display: none"';
    $vis = fn (bool $visible) => $visible ? '' : 'display: none';
    $tone = ['connected' => ['text-nq-success-text', 'bg-nq-success', 'border-nq-success/40 bg-nq-success-soft'], 'connecting' => ['text-nq-info-text', 'bg-nq-info', 'border-nq-info/40 bg-nq-info-soft'], 'reconnecting' => ['text-nq-warning-text', 'bg-nq-warning', 'border-nq-warning/40 bg-nq-warning-soft'], 'offline' => ['text-nq-danger-text', 'bg-nq-danger', 'border-nq-danger/40 bg-nq-danger-soft']];
    $label = $t::t('Live connection status', 'حالة الاتصال المباشر');
    $retryLabel = $t::t('Retry now', 'أعد المحاولة الآن');
    $init = ['state' => $state, 'latencyMs' => $latencyMs, 'retryAt' => $retryMs, 'attempt' => $attempt, 'showLatency' => (bool) $showLatency];
@endphp
@if ($variant === 'banner')
    <div data-slot="ws-status" data-variant="banner" data-state="{{ $state }}" x-data="nqWsStatus(@js($init))" x-modelable="state" x-bind="root"
        {{ $attributes->class(['group/ws flex flex-col gap-3 rounded-card border p-3 sm:flex-row sm:items-center sm:justify-between', $tone[$state][2]]) }}
        :class="boxClass()">
        <div class="flex min-w-0 items-start gap-3">
            <span aria-hidden="true" class="mt-0.5 size-4 shrink-0 {{ $tone[$state][0] }}" :class="textClass()">
                <x-nq::spinner x-show="state === 'connecting'" x-cloak :style="$vis($state === 'connecting')" class="size-4" />
                <x-lucide-refresh-cw x-show="state === 'reconnecting'" x-cloak :style="$vis($state === 'reconnecting')" class="size-4 motion-safe:animate-spin" />
                <x-lucide-wifi-off x-show="state === 'offline'" x-cloak :style="$vis($state === 'offline')" class="size-4" />
                <x-lucide-wifi x-show="state === 'connected'" x-cloak :style="$vis($state === 'connected')" class="size-4" />
            </span>
            <div class="flex min-w-0 flex-col gap-0.5">
                <p role="status" aria-label="{{ $label }}" class="text-label text-foreground">
                    @foreach ($states as $key => $words)<span x-show="state === '{{ $key }}'" x-cloak {!! $hide($state === $key) !!}>{{ $words[0] }}</span>@endforeach
                </p>
                <p class="text-body-sm text-muted-foreground">
                    @foreach ($states as $key => $words)<span x-show="state === '{{ $key }}'" x-cloak {!! $hide($state === $key) !!}>{{ $words[1] }}</span>@endforeach
                </p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                    <span data-slot="ws-countdown" class="tabular-nums" x-show="countdownText()" x-cloak x-text="countdownText()" {!! $hide($state === 'reconnecting' && $countdown !== '') !!}>{{ $state === 'reconnecting' ? $countdown : '' }}</span>
                    <span x-show="state === 'reconnecting' && attempt" x-cloak x-text="attemptText()" {!! $hide($state === 'reconnecting' && $attempt) !!}>{{ $state === 'reconnecting' && $attempt ? $t::t("Attempt {$attempt}", "المحاولة {$attempt}") : '' }}</span>
                    @if ($showLatency)<x-nq::ws-status.latency :ms="$latencyMs" :show="$hasLatency" />@endif
                    <span class="inline-flex gap-1" x-show="state === 'reconnecting' || state === 'offline'" x-cloak {!! $hide(in_array($state, ['reconnecting', 'offline'], true) && $lastMs !== null) !!}>
                        {{ $t::t('Last connected', 'آخر اتصال') }}
                        @if ($lastMs !== null)<x-nq::numeric.date-time :value="$lastConnectedAt" relative />@endif
                    </span>
                </div>
                <p class="text-caption text-muted-foreground" x-show="state === 'offline' || state === 'reconnecting'" x-cloak {!! $hide(in_array($state, ['offline', 'reconnecting'], true)) !!}>{{ $t::t('Data may be out of date.', 'قد تكون البيانات قديمة.') }}</p>
            </div>
        </div>
        @if ($retryable)
            <x-nq::button type="button" size="sm" variant="secondary" x-bind="retryButton" x-show="canRetry()" x-cloak :style="$vis($canRetry)" class="shrink-0">
                <x-nq::spinner x-show="retrying" x-cloak style="display: none" />
                <x-lucide-refresh-cw x-show="!retrying" />
                {{ $retryLabel }}
            </x-nq::button>
        @endif
    </div>
@else
    @php $inline = $variant === 'inline'; @endphp
    <div data-slot="ws-status" data-variant="{{ $variant }}" data-state="{{ $state }}" x-data="nqWsStatus(@js($init))" x-modelable="state" x-bind="root"
        {{ $attributes->cn($inline ? 'inline-flex flex-wrap items-center gap-2' : ['inline-flex h-7 max-w-full items-center gap-2 rounded-full border border-border bg-card ps-2.5 text-body-sm', $canRetry ? 'pe-1' : 'pe-3']) }}
        @unless ($inline) :class="canRetry() ? 'pe-1' : 'pe-3'" @endunless>
        <span aria-hidden="true" class="relative flex size-2 shrink-0">
            <span x-show="state === 'connected'" x-cloak {!! $hide($state === 'connected') !!} class="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping bg-nq-success"></span>
            <span class="relative inline-flex size-2 rounded-full {{ $tone[$state][1] }}" :class="dotClass()"></span>
        </span>
        <span role="status" aria-label="{{ $label }}" class="text-body-sm text-foreground">
            @foreach ($states as $key => $words)<span x-show="state === '{{ $key }}'" x-cloak {!! $hide($state === $key) !!}>{{ $words[0] }}</span>@endforeach
        </span>
        <span class="text-caption text-muted-foreground" x-show="countdownText()" x-cloak {!! $hide($state === 'reconnecting' && $countdown !== '') !!}><span data-slot="ws-countdown" class="tabular-nums" x-text="countdownText()">{{ $state === 'reconnecting' ? $countdown : '' }}</span></span>
        @if ($showLatency)<span class="text-caption text-muted-foreground" x-show="hasLatency()" x-cloak {!! $hide($hasLatency) !!}><x-nq::ws-status.latency :ms="$latencyMs" :show="$hasLatency" /></span>@endif
        @if ($retryable)
            @if ($inline)
                <x-nq::button type="button" size="sm" variant="link" x-bind="retryButton" x-show="canRetry()" x-cloak :style="$vis($canRetry)">{{ $retryLabel }}</x-nq::button>
            @else
                <x-nq::button type="button" size="sm" variant="ghost" x-bind="retryButton" x-show="canRetry()" x-cloak :style="$vis($canRetry)" class="h-5 rounded-full px-2 text-caption">{{ $retryLabel }}</x-nq::button>
            @endif
        @endif
    </div>
@endif

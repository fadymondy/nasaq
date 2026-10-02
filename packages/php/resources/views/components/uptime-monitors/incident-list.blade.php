{{-- <x-nq::uptime-monitors.incident-list :incidents="$incidents" />
     Incidents newest first: title, impact, status, when it started and how long it lasted, and optionally the update timeline.
     incidents: [['id', 'title', 'status' => investigating | identified | monitoring | resolved, 'impact' => minor | major | maintenance, 'startedAt', 'resolvedAt', 'services' => [], 'updates' => [['at', 'status', 'body']]]]; times are DateTime | ISO string | unix seconds.
     show-updates (true): the update timeline. Static: no Alpine needed. --}}
@props(['incidents' => [], 'showUpdates' => true])
@php
    $t = \Nasaq\Nasaq::class;
    $carbon = fn ($v) => $v instanceof \DateTimeInterface ? \Carbon\Carbon::instance($v) : (is_numeric($v) ? \Carbon\Carbon::createFromTimestamp($v) : \Carbon\Carbon::parse($v));
    $sorted = collect($incidents)->sortByDesc(fn ($i) => $carbon($i['startedAt'])->getTimestamp())->values();
    $status = [
        'investigating' => $t::t('Investigating', 'قيد التحقق'), 'identified' => $t::t('Identified', 'تم تحديد السبب'),
        'monitoring' => $t::t('Monitoring', 'تحت المراقبة'), 'resolved' => $t::t('Resolved', 'تم الحل'),
    ];
    $impact = ['minor' => $t::t('Minor', 'طفيف'), 'major' => $t::t('Major', 'كبير'), 'maintenance' => $t::t('Maintenance', 'صيانة')];
    $impactVariant = ['minor' => 'warning', 'major' => 'danger', 'maintenance' => 'info'];
    $units = ['d' => $t::t('d', 'ي'), 'h' => $t::t('h', 'س'), 'm' => $t::t('min', 'د')];
    $duration = function ($from, $to) use ($carbon, $units) {
        $total = max(1, (int) round(($carbon($to)->getTimestamp() - $carbon($from)->getTimestamp()) / 60));
        $d = intdiv($total, 1440); $h = intdiv($total % 1440, 60); $m = $total % 60;
        if ($d > 0) return $h ? "{$d} {$units['d']} {$h} {$units['h']}" : "{$d} {$units['d']}";
        if ($h > 0) return $m ? "{$h} {$units['h']} {$m} {$units['m']}" : "{$h} {$units['h']}";
        return "{$m} {$units['m']}";
    };
@endphp
@if ($sorted->isEmpty())
    <p class="rounded-control border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ $t::t('No incidents in this period.', 'لا حوادث في هذه الفترة.') }}</p>
@else
    <ul data-slot="{{ $attributes->get('data-slot', 'incident-list') }}" {{ $attributes->except('data-slot')->cn('grid gap-3') }}>
        @foreach ($sorted as $i)
            @php $open = $i['status'] !== 'resolved'; @endphp
            <li data-slot="incident" data-status="{{ $i['status'] }}" class="grid gap-2 rounded-control border border-border bg-card p-3">
                <div class="flex flex-wrap items-center gap-2">
                    <h4 class="min-w-0 flex-1 text-label text-foreground" dir="auto">{{ $i['title'] }}</h4>
                    <x-nq::badge :variant="$impactVariant[$i['impact']] ?? 'neutral'">{{ $impact[$i['impact']] ?? $i['impact'] }}</x-nq::badge>
                    <x-nq::badge :variant="$open ? 'warning' : 'success'">{{ $status[$i['status']] ?? $i['status'] }}</x-nq::badge>
                </div>
                <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
                    <span>{{ $t::t('Started', 'بدأت') }} <x-nq::numeric.date-time :value="$i['startedAt']" relative /></span>
                    @if (! empty($i['resolvedAt']))
                        <span>{{ $t::t('Lasted', 'استمرت') }} {{ $duration($i['startedAt'], $i['resolvedAt']) }}</span>
                    @endif
                    @if (! empty($i['services']))
                        <span dir="auto">{{ implode(', ', $i['services']) }}</span>
                    @endif
                </p>
                @if ($showUpdates && ! empty($i['updates']))
                    <x-nq::timeline aria-label="{{ $t::t('Updates', 'التحديثات') }}" class="mt-1">
                        @foreach (array_reverse($i['updates']) as $u)
                            <x-nq::timeline.item :title="$status[$u['status']] ?? $u['status']" :description="$u['body']" :time="$u['at']" />
                        @endforeach
                    </x-nq::timeline>
                @endif
            </li>
        @endforeach
    </ul>
@endif

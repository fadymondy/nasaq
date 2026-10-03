{{-- <x-nq::vuln-report.severity-tiles :counts="['critical' => 2, 'high' => 5, 'medium' => 9, 'low' => 14]" />
     Four tiles with the number of findings per severity. Severity is always spelled out, never colour alone.
     counts: array keyed critical / high / medium / low. labels: array overriding the words. --}}
@include('nasaq::components.vuln-report._logic')
@props(['counts' => [], 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_vr_words($locale, $labels);
    $sevBox = ['critical' => 'text-nq-danger', 'high' => 'text-nq-danger', 'medium' => 'text-nq-warning', 'low' => 'text-muted-foreground'];
@endphp
<dl data-slot="{{ $attributes->get('data-slot', 'severity-tiles') }}" {{ $attributes->except('data-slot')->cn('grid grid-cols-2 gap-2 sm:grid-cols-4') }}>
    @foreach (nq_vr_severities() as $s)
        <div data-severity="{{ $s }}" class="rounded-control border border-border bg-card p-3">
            <dt class="text-body-sm text-muted-foreground">{{ $t['severity'][$s] }}</dt>
            <dd class="text-h2 font-semibold tabular-nums {{ ($counts[$s] ?? 0) > 0 ? $sevBox[$s] : 'text-foreground' }}">
                <x-nq::numeric :value="$counts[$s] ?? 0" :locale="$locale" />
            </dd>
        </div>
    @endforeach
</dl>

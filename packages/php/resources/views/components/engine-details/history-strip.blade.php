{{-- <x-nq::engine-details.history-strip :days="[['date' => '2026-09-28', 'verdict' => 'on_protocol', 'entries' => 6]]" />
     The day strip: one cell per day, grouped by month, every cell with a full sentence for pointer and screen reader. days: OLDEST first, one per
     calendar day (date YYYY-MM-DD, verdict on_protocol | off_protocol | unevaluated, entries). labels: array overriding the built-in words. --}}
@include('nasaq::components.engine-card._health')
@include('nasaq::components.engine-details._logic')
@props(['days' => [], 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_ed_words($locale, $labels);
    $cell = [
        'on_protocol' => 'rounded-[3px] border border-nq-success bg-nq-success',
        'off_protocol' => 'rounded-[3px] border border-nq-danger bg-[repeating-linear-gradient(45deg,var(--nq-danger)_0_2px,transparent_2px_5px)]',
        'unevaluated' => 'rounded-full border border-dashed border-muted-foreground bg-transparent',
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'engine-history-strip') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    @foreach (nq_ed_group_months(array_values($days)) as $group)
        @php $month = nq_ed_civil($group['month'].'-01', $locale, 'month'); @endphp
        <section aria-label="{{ $month }}" class="flex flex-col gap-1.5">
            <h4 class="text-caption text-muted-foreground">{{ $month }}</h4>
            <ol class="m-0 flex list-none flex-wrap gap-1 p-0">
                @foreach ($group['days'] as $day)
                    @php $sentence = sprintf($t['dayLabel'], nq_ed_civil($day['date'], $locale, 'medium'), $t['verdicts'][$day['verdict']] ?? $day['verdict'], nq_ed_entries((int) $day['entries'], $locale)); @endphp
                    <li data-date="{{ $day['date'] }}" data-verdict="{{ $day['verdict'] }}" title="{{ $sentence }}" class="{{ \Nasaq\Cn::merge('size-4 shrink-0', $cell[$day['verdict']]) }}"><span class="sr-only">{{ $sentence }}</span></li>
                @endforeach
            </ol>
        </section>
    @endforeach
</div>

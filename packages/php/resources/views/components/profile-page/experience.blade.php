{{-- <x-nq::profile-page.experience :experience="[['id' => 'a', 'role' => 'Lead designer', 'company' => 'Acme', 'start' => '2021-03-01', 'end' => null]]" />
     Roles on a timeline, newest first: role and company, period and tenure, summary, highlights and skills. The total counts once where roles overlap.
     job: id, role, company, companyHref, start, end (null = current), location, summary, highlights[], skills[]. now: a fixed "today" for tests and stories. --}}
@props(['experience' => [], 'now' => null, 'locale' => null, 'labels' => []])
@include('nasaq::components.profile-page._logic')
@php
    $locale ??= app()->getLocale();
    $t = nq_pp_words($locale, (array) $labels);
    $nowAt = nq_pp_instant($now);
    $jobs = array_values(array_map(fn ($x) => (array) $x, (array) $experience));
    usort($jobs, fn ($a, $b) => nq_pp_instant($b['start'])->getTimestamp() <=> nq_pp_instant($a['start'])->getTimestamp());
    $total = nq_pp_total_experience($jobs, $nowAt);
    $hint = $t['experienceHint'].' '.nq_pp_fill($t['totalExperience'], ['time' => nq_pp_tenure_label($total, $t, $locale)]);
@endphp
<x-nq::profile-page.section :title="$t['experience']" :description="$hint" :locale="$locale" {{ $attributes }}>
    <x-nq::timeline>
        @foreach ($jobs as $job)
            @php
                $tenure = nq_pp_tenure_label(nq_pp_tenure(nq_pp_instant($job['start']), nq_pp_instant($job['end'] ?? $nowAt)), $t, $locale);
                $current = empty($job['end']);
                $hasBody = ! empty($job['summary']) || ! empty($job['highlights']) || ! empty($job['skills']);
            @endphp
            <x-nq::timeline.item>
                <x-slot:icon><x-nq::icon name="briefcase" /></x-slot:icon>
                <x-slot:title>
                    <span dir="auto" class="flex flex-wrap items-center gap-x-2">
                        <bdi>{{ $job['role'] }}</bdi>
                        <span class="font-normal text-muted-foreground">
                            @if (! empty($job['companyHref']))
                                <a href="{{ $job['companyHref'] }}" target="_blank" rel="noopener noreferrer" class="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current"><bdi>{{ $job['company'] }}</bdi></a>
                            @else
                                <bdi>{{ $job['company'] }}</bdi>
                            @endif
                        </span>
                        @if ($current)<x-nq::badge variant="success">{{ $t['current'] }}</x-nq::badge>@endif
                    </span>
                </x-slot:title>
                <x-slot:description>
                    <span class="flex flex-wrap gap-x-2">
                        <span>{{ nq_pp_period($job['start'], $job['end'] ?? null, $nowAt, $t, $locale) }}</span>
                        <span aria-hidden="true">·</span>
                        <span>{{ $tenure }}</span>
                        @if (! empty($job['location']))
                            <span aria-hidden="true">·</span>
                            <bdi>{{ $job['location'] }}</bdi>
                        @endif
                    </span>
                </x-slot:description>
                @if ($hasBody)
                    <div class="mt-2 flex w-full basis-full flex-col gap-2 pb-6">
                        @if (! empty($job['summary']))<p dir="auto" class="text-body-sm text-nq-fg-body">{{ $job['summary'] }}</p>@endif
                        @if (! empty($job['highlights']))
                            <ul dir="auto" class="list-disc space-y-1 ps-5 text-body-sm text-nq-fg-body marker:text-muted-foreground">
                                @foreach ($job['highlights'] as $h)<li>{{ $h }}</li>@endforeach
                            </ul>
                        @endif
                        @if (! empty($job['skills']))
                            <ul class="flex flex-wrap gap-1.5">
                                @foreach ($job['skills'] as $s)<li><x-nq::badge variant="outline"><bdi>{{ $s }}</bdi></x-nq::badge></li>@endforeach
                            </ul>
                        @endif
                    </div>
                @endif
            </x-nq::timeline.item>
        @endforeach
    </x-nq::timeline>
</x-nq::profile-page.section>

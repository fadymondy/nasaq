{{-- <x-nq::personal-widgets.now-widget :items="[['label' => 'Building', 'text' => 'A design system'], ['label' => 'Reading', 'text' => 'Refactoring UI', 'href' => 'https://example.com']]" updated="2026-09-20" />
     A "now" page in a card: what the owner is building, reading and learning at the moment.
     items: each ['label', 'text', 'href' (optional)]. updated: when the list was last edited. title: default "Now". labels: ['now' => …, 'updated' => 'Updated {date}']. --}}
@props(['items' => [], 'updated' => null, 'title' => null, 'labels' => [], 'locale' => null])
@php
    $ar = \Nasaq\Nasaq::rtl();
    $locale ??= $ar ? 'ar' : str_replace('_', '-', app()->getLocale());
    $t = array_merge($ar ? ['now' => 'الآن', 'updated' => 'حُدّث {date}'] : ['now' => 'Now', 'updated' => 'Updated {date}'], (array) $labels);
    $date = null;
    if ($updated !== null) {
        $d = $updated instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($updated) : (is_numeric($updated) ? new \DateTimeImmutable('@'.(int) $updated) : new \DateTimeImmutable($updated));
        $date = class_exists(\IntlDateFormatter::class)
            ? (new \IntlDateFormatter($locale.'@numbers=latn', \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, $d->getTimezone()->getName() === 'Z' ? 'UTC' : $d->getTimezone()->getName()))->format($d)
            : $d->format('M j, Y');
    }
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'now-widget') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3 rounded-card border border-border bg-card py-4 text-card-foreground') }}>
    <div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4">
        <div data-slot="card-title" class="text-label text-foreground">{{ $title ?? $t['now'] }}</div>
        @if ($date !== null)<p class="text-caption text-muted-foreground">{{ str_replace('{date}', $date, $t['updated']) }}</p>@endif
    </div>
    <div data-slot="card-content" class="px-4">
        <dl class="flex flex-col gap-2.5">
            @foreach ((array) $items as $i)
                @php $i = (array) $i; @endphp
                <div class="flex flex-col gap-0.5">
                    <dt class="text-caption text-muted-foreground">{{ $i['label'] ?? '' }}</dt>
                    <dd dir="auto" class="text-body-sm text-foreground">
                        @if (! empty($i['href']))<a href="{{ $i['href'] }}" class="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current">{{ $i['text'] ?? '' }}</a>@else{{ $i['text'] ?? '' }}@endif
                    </dd>
                </div>
            @endforeach
        </dl>
    </div>
</div>

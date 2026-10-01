{{-- <x-nq::states.loading rows="3" />   <x-nq::states.loading :rows="0" label="Saving" />
     label: announced to assistive tech, and shown when rows is 0 (Loading… / جارٍ التحميل…). rows: skeleton rows. --}}
@props(['label' => null, 'rows' => 3])
@php
    $label ??= \Nasaq\Nasaq::t('Loading…', 'جارٍ التحميل…');
    $widths = [62, 44, 54, 38];
@endphp
<div data-slot="loading-state" role="status" aria-live="polite" {{ $attributes->cn('flex flex-col gap-2') }}>
    <span class="sr-only">{{ $label }}</span>
    @if ((int) $rows > 0)
        @for ($i = 0; $i < (int) $rows; $i++)
            <div class="flex h-row items-center gap-3 border-b border-border px-1">
                <x-nq::states.skeleton class="size-5 rounded-[4px]" />
                <x-nq::states.skeleton class="h-3" style="inline-size: {{ $widths[$i % 4] }}%" />
            </div>
        @endfor
    @else
        <div class="flex items-center justify-center gap-2 py-8 text-body-sm text-muted-foreground">
            <x-nq::spinner /> <span aria-hidden="true">{{ $label }}</span>
        </div>
    @endif
</div>

{{-- <x-nq::states.loading rows="3" />   <x-nq::states.loading :rows="0" label="Saving" />
     <x-nq::states.loading shape="grid" :rows="6" :columns="3" />   <x-nq::states.loading shape="timeline" :rows="4" caption="Fetching the last 30 days…" />
     label: announced to assistive tech, and shown when rows is 0 (Loading… / جارٍ التحميل…). rows: skeleton items (rows, cards or events); 0 shows a spinner.
     shape: rows | grid | timeline (the layout to preview).   columns: 1-4 for shape="grid" from the sm breakpoint up (default 3).
     caption: visible text under the skeleton, also announced. --}}
@props(['label' => null, 'rows' => 3, 'shape' => 'rows', 'columns' => 3, 'caption' => null])
@php
    $label ??= \Nasaq\Nasaq::t('Loading…', 'جارٍ التحميل…');
    $widths = [62, 44, 54, 38];
    $gridCols = [1 => 'sm:grid-cols-1', 2 => 'sm:grid-cols-2', 3 => 'sm:grid-cols-3', 4 => 'sm:grid-cols-4'];
    $n = (int) $rows;
    $hasCaption = $caption !== null && $caption !== '';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'loading-state') }}" data-shape="{{ $shape }}" role="status" aria-live="polite" {{ $attributes->except('data-slot')->cn('flex flex-col gap-2') }}>
    @unless ($hasCaption)<span class="sr-only">{{ $label }}</span>@endunless
    @if ($n <= 0)
        <div class="flex items-center justify-center gap-2 py-8 text-body-sm text-muted-foreground">
            <x-nq::spinner /> <span aria-hidden="true">{{ $label }}</span>
        </div>
    @elseif ($shape === 'grid')
        <div class="grid grid-cols-1 gap-3 {{ $gridCols[(int) $columns] ?? $gridCols[3] }}">
            @for ($i = 0; $i < $n; $i++)
                <div data-slot="loading-card" class="flex flex-col gap-3 rounded-card border border-border p-4">
                    <div class="flex items-center gap-3">
                        <x-nq::states.skeleton class="size-8 rounded-control" />
                        <x-nq::states.skeleton class="h-3" style="inline-size: {{ $widths[$i % 4] }}%" />
                    </div>
                    <x-nq::states.skeleton class="h-3 w-full" />
                    <x-nq::states.skeleton class="h-3" style="inline-size: {{ $widths[($i + 2) % 4] + 20 }}%" />
                </div>
            @endfor
        </div>
    @elseif ($shape === 'timeline')
        <ol class="flex flex-col">
            @for ($i = 0; $i < $n; $i++)
                <li data-slot="loading-event" class="relative flex gap-3 pb-5 last:pb-0">
                    @if ($i < $n - 1)<span aria-hidden="true" class="absolute start-[9px] top-6 bottom-1 w-px bg-border"></span>@endif
                    <x-nq::states.skeleton class="mt-0.5 size-5 shrink-0 rounded-full" />
                    <div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                        <x-nq::states.skeleton class="h-3" style="inline-size: {{ $widths[$i % 4] }}%" />
                        <x-nq::states.skeleton class="h-2.5 w-24" />
                    </div>
                </li>
            @endfor
        </ol>
    @else
        @for ($i = 0; $i < $n; $i++)
            <div class="flex h-row items-center gap-3 border-b border-border px-1">
                <x-nq::states.skeleton class="size-5 rounded-[4px]" />
                <x-nq::states.skeleton class="h-3" style="inline-size: {{ $widths[$i % 4] }}%" />
            </div>
        @endfor
    @endif
    @if ($hasCaption && $n > 0)
        <p class="flex items-center gap-2 pt-1 text-caption text-muted-foreground">{{ $caption }}</p>
    @elseif ($hasCaption)
        <span class="sr-only">{{ $caption }}</span>
    @endif
</div>

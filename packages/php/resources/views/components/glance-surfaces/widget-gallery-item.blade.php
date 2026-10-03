{{-- <x-nq::glance-surfaces.widget-gallery-item id="steps" title="Steps" description="Daily goal" :sizes="['small', 'medium']">
         <x-nq::glance-surfaces.widget-tile size="small" x-show="size === 'small'" … />
         <x-nq::glance-surfaces.widget-tile size="medium" x-show="size === 'medium'" style="display: none" … />
     </x-nq::glance-surfaces.widget-gallery-item>
     One entry of a widget-gallery. The slot holds one preview tile per size, each with x-show="size === '<size>'" (hide all but the
     first with style="display: none" so nothing flashes before Alpine starts). sizes: circular | inline | small | medium | large. --}}
@aware(['added' => [], 'removable' => true, 'labels' => [], 'locale' => null])
@props(['id', 'title', 'description' => null, 'sizes' => ['small']])
@php
    $locale ??= app()->getLocale();
    $ar = str_starts_with($locale, 'ar');
    $t = array_merge($ar ? [
        'add' => 'إضافة الودجت', 'added' => 'تمت الإضافة', 'remove' => 'إزالة', 'sizes' => 'حجم الودجت',
        'small' => 'صغير', 'medium' => 'متوسط', 'large' => 'كبير', 'circular' => 'دائري', 'inline' => 'سطري',
    ] : [
        'add' => 'Add widget', 'added' => 'Added', 'remove' => 'Remove', 'sizes' => 'Widget size',
        'small' => 'Small', 'medium' => 'Medium', 'large' => 'Large', 'circular' => 'Circular', 'inline' => 'Inline',
    ], $labels);
    $sizes = array_values($sizes);
    $first = $sizes[0] ?? 'small';
    $isAdded = in_array($id, $added, true);
    $hide = 'display: none';
@endphp
<article role="listitem" data-widget-id="{{ $id }}" x-data="{ size: @js($first), id: @js($id) }" {{ $attributes->cn('flex flex-col items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4') }}>
    <div class="flex w-full min-h-40 items-center justify-center overflow-hidden">{{ $slot }}</div>
    <div class="min-w-0">
        <h3 class="text-label font-semibold text-foreground">{{ $title }}</h3>
        @if ($description)<p class="text-caption text-muted-foreground">{{ $description }}</p>@endif
    </div>
    <div class="flex w-full flex-wrap items-center justify-between gap-2">
        @if (count($sizes) > 1)
            <div role="radiogroup" aria-label="{{ $t['sizes'] }}: {{ $title }}" class="flex gap-0.5 rounded-control bg-secondary p-0.5">
                @foreach ($sizes as $option)
                    <button type="button" role="radio" aria-checked="{{ $option === $first ? 'true' : 'false' }}"
                        x-on:click="size = @js($option)" x-effect="$el.setAttribute('aria-checked', size === @js($option))"
                        class="h-7 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-caption text-muted-foreground outline-none hover:text-foreground aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-xs focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $t[$option] ?? $option }}</button>
                @endforeach
            </div>
        @else
            <span></span>
        @endif
        <x-nq::button size="sm" variant="secondary" x-show="isAdded(id)" :style="$isAdded ? null : $hide"
            :disabled="! $removable" x-on:click="remove(id)">
            <x-lucide-check aria-hidden="true" />
            {{ $removable ? $t['remove'] : $t['added'] }}
        </x-nq::button>
        <x-nq::button size="sm" variant="primary" x-show="! isAdded(id)" :style="$isAdded ? $hide : null"
            x-on:click="add(id, size)">
            <x-lucide-plus aria-hidden="true" />
            {{ $t['add'] }}
        </x-nq::button>
    </div>
</article>

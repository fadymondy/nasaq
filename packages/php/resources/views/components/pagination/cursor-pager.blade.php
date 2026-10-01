{{-- <x-nq::pagination.cursor-pager :from="21" :to="40" :total="95" :has-previous="true" :has-next="true" />
     Previous/next only, for cursor-based lists, with a "Showing 21–40 of 95" label. Omit total when unknown.
     loading disables both buttons. Named slots summary, previous and next replace the texts.
     previous-url / next-url make the buttons links. Otherwise the buttons carry data-slot="cursor-pager-previous" / "cursor-pager-next":
     listen on the pager, @click="$event.target.closest('[data-slot=cursor-pager-next]') && next()". --}}
@props(['from', 'to', 'total' => null, 'hasPrevious' => false, 'hasNext' => false, 'loading' => false, 'label' => null, 'previousUrl' => null, 'nextUrl' => null])
@php
    $t = \Nasaq\Nasaq::class;
    $showing = $total === null
        ? $t::t("Showing {$from}–{$to}", "عرض {$from}–{$to}")
        : $t::t("Showing {$from}–{$to} of {$total}", "عرض {$from}–{$to} من {$total}");
@endphp
<nav data-slot="cursor-pager" aria-label="{{ $label ?? $t::t('Pagination', 'ترقيم الصفحات') }}" {{ $attributes->cn('flex w-full items-center justify-between gap-3') }}>
    <p class="text-body-sm text-muted-foreground tabular-nums">{{ $summary ?? new \Illuminate\Support\HtmlString('<bdi>'.e($showing).'</bdi>') }}</p>
    <div class="flex items-center gap-2">
        <x-nq::button data-slot="cursor-pager-previous" size="sm" :href="$hasPrevious && ! $loading ? $previousUrl : null" :disabled="! $hasPrevious || $loading">
            <x-nq::icon name="chevron-left" />
            {{ $previous ?? $t::t('Previous', 'السابق') }}
        </x-nq::button>
        <x-nq::button data-slot="cursor-pager-next" size="sm" :href="$hasNext && ! $loading ? $nextUrl : null" :disabled="! $hasNext || $loading">
            {{ $next ?? $t::t('Next', 'التالي') }}
            <x-nq::icon name="chevron-right" />
        </x-nq::button>
    </div>
</nav>

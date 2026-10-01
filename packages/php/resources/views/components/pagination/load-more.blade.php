{{-- <x-nq::pagination.load-more @click="loadMore()" />   <x-nq::pagination.load-more :loading="true" />
     A button that appends the next batch. loading shows a spinner and blocks repeat presses. Same props as <x-nq::button>. --}}
@props(['variant' => 'secondary', 'loading' => false, 'disabled' => false])
<x-nq::button data-slot="load-more" :variant="$variant" :loading="$loading" :disabled="$disabled" {{ $attributes }}>
    {{ $slot->isEmpty() ? \Nasaq\Nasaq::t('Load more', 'تحميل المزيد') : $slot }}
</x-nq::button>

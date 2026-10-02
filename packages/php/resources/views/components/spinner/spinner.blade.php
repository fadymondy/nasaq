{{-- <x-nq::spinner />   <x-nq::spinner label="Loading orders" class="size-6" />
     With a label it is announced (role="status"); without one it is decorative. --}}
@props(['label' => null])
@if ($label)
    <span role="status" class="inline-flex">
        <x-lucide-loader-circle data-slot="{{ $attributes->get('data-slot', 'spinner') }}" aria-hidden="true" {{ $attributes->except('data-slot')->cn('size-4 animate-spin motion-reduce:animate-none') }} />
        <span class="sr-only">{{ $label }}</span>
    </span>
@else
    <x-lucide-loader-circle data-slot="{{ $attributes->get('data-slot', 'spinner') }}" aria-hidden="true" {{ $attributes->except('data-slot')->cn('size-4 animate-spin motion-reduce:animate-none') }} />
@endif

{{-- <x-nq.empty title="No orders yet" description="Orders show up here once customers check out.">
         <x-nq.button variant="primary">Create order</x-nq.button>
     </x-nq.empty> --}}
@props(['title', 'description' => null])
<div {{ $attributes->merge(['class' => 'nq-empty']) }}>
    {{ $icon ?? '' }}
    <p class="nq-empty-title">{{ $title }}</p>
    @if ($description)<p class="nq-empty-description">{{ $description }}</p>@endif
    {{ $slot }}
</div>

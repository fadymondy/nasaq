{{-- <x-nq.card title="Revenue" description="Last 30 days">
         <x-slot:action><x-nq.button size="sm">Export</x-nq.button></x-slot:action>
         body
         <x-slot:footer>…</x-slot:footer>
     </x-nq.card> --}}
@props(['title' => null, 'description' => null])
<div {{ $attributes->merge(['class' => 'nq-card']) }}>
    @if ($title || $description || isset($action))
        <div class="nq-card-header">
            @if ($title)<h3 class="nq-card-title">{{ $title }}</h3>@endif
            @if ($description)<p class="nq-card-description">{{ $description }}</p>@endif
            @isset($action)<div class="nq-card-action">{{ $action }}</div>@endisset
        </div>
    @endif
    <div class="nq-card-content">{{ $slot }}</div>
    @isset($footer)<div class="nq-card-footer">{{ $footer }}</div>@endisset
</div>

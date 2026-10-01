{{-- <x-nq::install-button app-name="Mahaam" state="available" wire:click="install" />
     The install CTA for an app or product. You own state: available | installing | installed | update. Once installed it
     turns into a quiet "Open"; installing shows a spinner and blocks clicks. free: "Get" instead of "Install".
     variant (secondary), size (sm), labels (['install' => ..., 'get' => ..., 'open' => ..., 'update' => ...]).
     Wire the click with wire:click, x-on:click or href: the button is the element that receives your attributes. --}}
@props(['state' => 'available', 'appName', 'free' => false, 'labels' => [], 'variant' => null, 'size' => 'sm', 'href' => null])
@php
    $l = array_merge([
        'install' => \Nasaq\Nasaq::t('Install', 'تثبيت'),
        'get' => \Nasaq\Nasaq::t('Get', 'احصل عليه'),
        'open' => \Nasaq\Nasaq::t('Open', 'فتح'),
        'update' => \Nasaq\Nasaq::t('Update', 'تحديث'),
    ], $labels);
    $installed = $state === 'installed';
    $label = $installed ? $l['open'] : ($state === 'update' ? $l['update'] : ($free ? $l['get'] : $l['install']));
@endphp
<x-nq::button data-slot="install-button" data-state="{{ $state }}" :variant="$installed ? 'ghost' : ($variant ?? 'secondary')" :size="$size"
    :href="$href" :loading="$state === 'installing'" aria-label="{{ $label }} {{ $appName }}" {{ $attributes }}>
    @if ($installed)<x-lucide-check aria-hidden="true" class="text-nq-success-text" />@endif
    {{ $label }}
</x-nq::button>

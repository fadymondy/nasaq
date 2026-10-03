{{-- Internal: the install button of a catalog card or sheet, driven by the nqCatalogStore state of the item ($id).
     Same look as <x-nq::install-button>: available -> "Install"/"Get", installing -> busy, installed -> a quiet "Open". --}}
@props(['id', 'name', 'free' => false, 'installed' => false, 'variant' => null, 'size' => 'sm', 'labels' => []])
@php
    $l = array_merge([
        'install' => \Nasaq\Nasaq::t('Install', 'تثبيت'),
        'get' => \Nasaq\Nasaq::t('Get', 'احصل عليه'),
        'open' => \Nasaq\Nasaq::t('Open', 'فتح'),
    ], $labels);
    $label = $free ? $l['get'] : $l['install'];
    $state = $installed ? 'installed' : 'available';
@endphp
<span {{ $attributes->cn('contents') }}>
    <x-nq::button data-slot="install-button" data-state="{{ $state }}" :variant="$variant ?? 'secondary'" :size="$size" aria-label="{{ $label }} {{ $name }}"
        :style="$installed ? 'display: none' : null"
        x-show="!installed('{{ $id }}')"
        x-bind:data-state="stateOf('{{ $id }}')"
        x-bind:disabled="busyOf('{{ $id }}') === 'install'"
        x-bind:aria-busy="busyOf('{{ $id }}') === 'install' ? 'true' : null"
        x-on:click="install('{{ $id }}')">{{ $label }}</x-nq::button>
    <x-nq::button data-slot="install-button" data-state="installed" variant="ghost" :size="$size" aria-label="{{ $l['open'] }} {{ $name }}"
        :style="! $installed ? 'display: none' : null"
        x-show="installed('{{ $id }}')"
        x-on:click="openApp('{{ $id }}')"><x-lucide-check aria-hidden="true" class="text-nq-success-text" />{{ $l['open'] }}</x-nq::button>
</span>

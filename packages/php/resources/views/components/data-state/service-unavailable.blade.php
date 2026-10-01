{{-- <x-nq::data-state.service-unavailable :retry="['wire:click' => 'load']" />
     An inline 503 card: the backend or a plugin is down, not the page. retry: the attributes of the "Try again" button
     (none: no button). The actions slot replaces it. title, description, icon ("cloud-off"), labels. --}}
@props(['title' => null, 'description' => null, 'icon' => 'cloud-off', 'retry' => null, 'labels' => [], 'actions' => null])
@php
    $title ??= $labels['unavailableTitle'] ?? \Nasaq\Nasaq::t('This service is not available right now', 'هذه الخدمة غير متاحة الآن');
    $description ??= $labels['unavailableBody'] ?? \Nasaq\Nasaq::t('It may be starting up or under maintenance. Try again in a moment.', 'قد تكون قيد التشغيل أو الصيانة. حاول مرة أخرى بعد قليل.');
    $retryLabel = $labels['retry'] ?? \Nasaq\Nasaq::t('Try again', 'حاول مرة أخرى');
    $retryBag = new \Illuminate\View\ComponentAttributeBag(is_array($retry) ? $retry : []);
    $hasActions = $actions && ! $actions->isEmpty();
@endphp
<x-nq::states kind="service-unavailable" role="status" :icon="$icon" :title="$title" :description="$description" {{ $attributes }}>
    @if ($hasActions)
        <x-slot:actions>{{ $actions }}</x-slot:actions>
    @elseif (is_array($retry))
        <x-slot:actions><x-nq::button size="sm" :attributes="$retryBag">{{ $retryLabel }}</x-nq::button></x-slot:actions>
    @endif
</x-nq::states>

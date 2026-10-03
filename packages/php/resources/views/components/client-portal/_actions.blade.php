{{-- Internal: the context-menu content of x-nq::client-portal for one item. Needs $kind (task | request | activity), $actions and $id (a string or an Alpine expression when $dynamic). --}}
<x-nq::context-menu.content class="min-w-44">
    @foreach ($actions as $k => $a)
        @if ($k > 0 && ($a['group'] ?? null) !== ($actions[$k - 1]['group'] ?? null))
            <x-nq::context-menu.separator />
        @endif
        <x-nq::context-menu.item :variant="! empty($a['danger']) ? 'danger' : 'default'" :disabled="! empty($a['disabled'])" x-on:click="act('{{ $kind }}', '{{ $a['id'] }}', '{{ $id }}')">
            @if (! empty($a['icon']))<x-dynamic-component :component="'lucide-'.$a['icon']" aria-hidden="true" />@endif
            {{ $a['label'] }}
        </x-nq::context-menu.item>
    @endforeach
</x-nq::context-menu.content>

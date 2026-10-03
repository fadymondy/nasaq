{{-- Internal: one testimonial of x-nq::testimonials. Needs $item, $t (the words), $actions (list, may be empty) and $spotlight (bool). --}}
@php
    $sub = implode(', ', array_filter([$item['role'] ?? null, $item['company'] ?? null]));
    $rating = (int) ($item['rating'] ?? 0);
    $figureClass = 'flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus '.($spotlight ? 'p-6 sm:p-10' : 'p-5');
    $id = (string) $item['id'];
@endphp
@if ($actions)
    <x-nq::context-menu>
        <x-nq::context-menu.trigger class="grid">
            <figure data-slot="testimonial" data-id="{{ $id }}" tabindex="0" class="{{ $figureClass }}">
                @include('nasaq::components.testimonials._body')
            </figure>
        </x-nq::context-menu.trigger>
        <x-nq::context-menu.content class="min-w-44">
            @foreach ($actions as $k => $a)
                @if ($k > 0 && ($a['group'] ?? null) !== ($actions[$k - 1]['group'] ?? null))
                    <x-nq::context-menu.separator />
                @endif
                <x-nq::context-menu.item :variant="! empty($a['danger']) ? 'danger' : 'default'" :disabled="! empty($a['disabled'])" data-action="{{ $a['id'] }}" data-item-id="{{ $id }}" x-on:click="act($el.dataset.action, $el.dataset.itemId)">
                    @if (! empty($a['icon']))<x-dynamic-component :component="'lucide-'.$a['icon']" aria-hidden="true" />@endif
                    {{ $a['label'] }}
                </x-nq::context-menu.item>
            @endforeach
        </x-nq::context-menu.content>
    </x-nq::context-menu>
@else
    <figure data-slot="testimonial" data-id="{{ $id }}" class="{{ $figureClass }}">
        @include('nasaq::components.testimonials._body')
    </figure>
@endif

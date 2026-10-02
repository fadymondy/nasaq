{{-- Internal: a live price like <x-nq::price> for the cart parts. Needs $amount (an Alpine expression, minor units), $compare (an expression or null), $compareShow (when to show it, default $compare), $size (sm | md | lg). --}}
@php
    $sizes = ['sm' => ['text-body-sm', 'font-medium'], 'md' => ['text-body', 'font-medium'], 'lg' => ['text-body-sm', 'text-h2 font-semibold tracking-tight']];
    [$rootClass, $amountClass] = $sizes[$size ?? 'sm'] ?? $sizes['sm'];
@endphp
<span data-slot="price" class="inline-flex flex-wrap items-baseline gap-x-1.5 text-foreground {{ $rootClass }}">
    <span><bdi class="tabular-nums {{ $amountClass }}" x-text="price({{ $amount }})"></bdi></span>
    @if (! empty($compare))
        <s x-show="{{ $compareShow ?? $compare }}" style="display: none" class="text-caption text-muted-foreground decoration-muted-foreground/60">
            <span class="sr-only">{{ \Nasaq\Nasaq::t('was ', 'بدلًا من ') }}</span>
            <bdi class="tabular-nums" x-text="money({{ $compare }})"></bdi>
        </s>
    @endif
</span>

{{-- Internal: a live price like <x-nq::price> for the cart parts. Needs $amount (an Alpine expression, minor units), $compare (an expression or null), $compareShow (when to show it, default $compare), $size (sm | md | lg). Optional $amountText and $compareText: the server-rendered text the bindings start from. --}}
@php
    $sizes = ['sm' => ['text-body-sm', 'font-medium'], 'md' => ['text-body', 'font-medium'], 'lg' => ['text-body-sm', 'text-h2 font-semibold tracking-tight']];
    [$rootClass, $amountClass] = $sizes[$size ?? 'sm'] ?? $sizes['sm'];
@endphp
<span data-slot="price" class="inline-flex flex-wrap items-baseline gap-x-1.5 text-foreground {{ $rootClass }}">
    <span><bdi class="tabular-nums {{ $amountClass }}" x-text="price({{ $amount }})">{{ $amountText ?? '' }}</bdi></span>
    @if (! empty($compare))
        <s x-show="{{ $compareShow ?? $compare }}" @if (empty($compareText)) style="display: none" @endif class="text-caption text-muted-foreground decoration-muted-foreground/60">
            <span class="sr-only">{{ \Nasaq\Nasaq::t('was ', 'بدلًا من ') }}</span>
            <bdi class="tabular-nums" x-text="money({{ $compare }})">{{ $compareText ?? '' }}</bdi>
        </s>
    @endif
</span>

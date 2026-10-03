{{-- <x-nq::screenshot-frame variant="browser" title="app.mahaam.com/board" label="Mahaam board with three columns"> <img src="/board.png" alt=""> </x-nq::screenshot-frame>
     Frames a product screenshot as a window, browser tab or phone. title (window title or address) is always left-to-right.
     label: what the screenshot shows; the frame is then announced as one image and its content is inert. caption: visible text under the frame. --}}
@props(['variant' => 'window', 'title' => null, 'label' => null, 'caption' => null])
@php
    $phone = $variant === 'phone';
    $screenClass = 'relative overflow-hidden bg-background '.($phone ? 'aspect-[9/19] rounded-[1.75rem]' : 'rounded-b-[calc(var(--radius-card)-1px)]');
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
@endphp
<figure data-slot="{{ $attributes->get('data-slot', 'screenshot-frame') }}" data-variant="{{ $variant }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3 '.($phone ? 'items-center' : '')) }}>
    @if ($phone)
        <div class="w-full max-w-[18rem] rounded-[2.25rem] bg-nq-surface-raised p-2 shadow-lg ring-1 ring-border">
            <div data-slot="screenshot-frame-screen" @if ($label) role="img" aria-label="{{ $label }}" @endif class="{{ $screenClass }}">
                <div @if ($label) aria-hidden="true" inert @endif class="size-full">{{ $slot }}</div>
            </div>
        </div>
    @else
        <div class="w-full overflow-hidden rounded-card bg-nq-surface-raised shadow-lg ring-1 ring-border">
            <div data-slot="screenshot-frame-bar" class="flex h-9 items-center gap-3 px-3">
                <span aria-hidden="true" class="flex gap-1.5">
                    <span class="size-2.5 rounded-full bg-nq-line-strong"></span>
                    <span class="size-2.5 rounded-full bg-nq-line-strong"></span>
                    <span class="size-2.5 rounded-full bg-nq-line-strong"></span>
                </span>
                @if ($has($title))
                    @if ($variant === 'browser')
                        <span dir="ltr" class="mx-auto flex h-6 w-full max-w-xs items-center justify-center truncate rounded-control bg-secondary px-3 text-caption text-muted-foreground">{{ $title }}</span>
                    @else
                        <span dir="ltr" class="mx-auto truncate text-caption text-muted-foreground">{{ $title }}</span>
                    @endif
                @endif
                <span aria-hidden="true" class="w-[42px]"></span>
            </div>
            <div data-slot="screenshot-frame-screen" @if ($label) role="img" aria-label="{{ $label }}" @endif class="{{ $screenClass }}">
                <div @if ($label) aria-hidden="true" inert @endif class="size-full">{{ $slot }}</div>
            </div>
        </div>
    @endif
    @if ($has($caption))
        <figcaption class="text-center text-caption text-muted-foreground">{{ $caption }}</figcaption>
    @endif
</figure>

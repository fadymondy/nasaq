{{-- <x-nq::auth-layout title="Sign in" description="Use your work email."> <form>…</form>
       <x-slot:prompt>No account? <a href="/sign-up">Create one</a></x-slot:prompt>
       <x-slot:footer><x-nq::auth-layout.footer :links="[…]" /></x-slot:footer>
     </x-nq::auth-layout>
     The page frame for sign-in, sign-up and recovery screens (<main>, the h1, the footer). variant: card (default) | split.
     title / description, mark: false hides the mark, backdrop: false hides the scene, origin: false hides the secure-connection line.
     Slots: default (the form), markSlot, panel, logo, prompt, footer, originSlot (as <x-slot:prompt> etc.). --}}
@props(['variant' => 'card', 'title' => null, 'description' => null, 'mark' => true, 'backdrop' => true, 'origin' => true,
    'markSlot' => null, 'panel' => null, 'logo' => null, 'prompt' => null, 'footer' => null, 'originSlot' => null])
@php
    $has = fn ($s) => $s && ! $s->isEmpty();
    $hasHeading = filled($title) || filled($description);
    $promptClasses = 'text-center text-body-sm text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline';
    $size = $variant === 'split' ? 104 : 112;
@endphp
@if ($variant === 'split')
    <div data-slot="{{ $attributes->get('data-slot', 'auth-layout') }}" data-variant="split" {{ $attributes->except('data-slot')->cn('grid min-h-dvh bg-background text-foreground lg:grid-cols-2') }}>
        <aside data-slot="auth-layout-panel" class="relative isolate hidden flex-col justify-between gap-8 overflow-hidden border-e border-border bg-muted p-10 text-foreground lg:flex">
            @if ($backdrop) <x-nq::auth-layout.backdrop /> @endif
            @if ($has($panel)) {{ $panel }}
            @else
                <div class="flex flex-1 items-center justify-center">
                    @if ($mark) @if ($has($logo)) {{ $logo }} @else <x-nq::product-mark.logo :size="56" /> @endif @endif
                </div>
            @endif
        </aside>
        <div class="flex min-w-0 flex-col p-6 sm:p-10">
            <main data-slot="auth-layout-main" data-auth-stagger class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-8">
                @if ($mark)
                    <div data-slot="auth-layout-mark" class="flex justify-center">@if ($has($markSlot)) {{ $markSlot }} @else <x-nq::auth-layout.emblem :size="$size" /> @endif</div>
                @endif
                @if ($hasHeading)
                    <header data-slot="auth-layout-header" class="flex flex-col items-center gap-1.5 text-center">
                        @if (filled($title)) <h1 data-slot="auth-layout-title" class="text-h1 text-foreground">{{ $title }}</h1> @endif
                        @if (filled($description)) <p class="text-body-sm text-muted-foreground">{{ $description }}</p> @endif
                    </header>
                @endif
                {{ $slot }}
                @if ($has($prompt)) <p data-slot="auth-layout-prompt" class="{{ $promptClasses }}">{{ $prompt }}</p> @endif
            </main>
            @if ($has($footer))
                <div class="mx-auto w-full max-w-sm"><footer data-slot="auth-layout-footer" class="text-caption text-muted-foreground">{{ $footer }}</footer></div>
            @endif
        </div>
    </div>
@else
    <div data-slot="{{ $attributes->get('data-slot', 'auth-layout') }}" data-variant="card" {{ $attributes->except('data-slot')->cn('relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-background p-4 text-foreground sm:p-6') }}>
        @if ($backdrop) <x-nq::auth-layout.backdrop /> @endif
        <main data-slot="auth-layout-main" class="flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-4 py-8">
            <x-nq::card data-auth-card data-auth-stagger class="gap-6 px-6 py-8 sm:px-10 sm:py-10">
                @if ($mark)
                    <div data-slot="auth-layout-mark" class="flex justify-center">@if ($has($markSlot)) {{ $markSlot }} @else <x-nq::auth-layout.emblem :size="$size" /> @endif</div>
                @endif
                @if ($hasHeading)
                    <header data-slot="auth-layout-header" class="flex flex-col items-center gap-1.5 text-center">
                        @if (filled($title)) <h1 data-slot="auth-layout-title" class="text-h1 text-foreground">{{ $title }}</h1> @endif
                        @if (filled($description)) <p class="text-body-sm text-muted-foreground">{{ $description }}</p> @endif
                    </header>
                @endif
                {{ $slot }}
                @if ($has($prompt)) <p data-slot="auth-layout-prompt" class="{{ $promptClasses }}">{{ $prompt }}</p> @endif
            </x-nq::card>
            @if ($origin) @if ($has($originSlot)) {{ $originSlot }} @else <x-nq::auth-layout.origin /> @endif @endif
        </main>
        @if ($has($footer))
            <div class="w-full max-w-[26rem]"><footer data-slot="auth-layout-footer" class="text-caption text-muted-foreground">{{ $footer }}</footer></div>
        @endif
    </div>
@endif

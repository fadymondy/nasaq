{{-- <x-nq::brand-loaders name="Nasaq" stage="Loading your workspace" :progress="40" />
     <x-nq::brand-loaders state="failed" name="Nasaq" :error="['message' => 'We could not reach the server.', 'detail' => 'req_8f2a91']" retry />
     The full-screen boot splash: says what is happening, says so plainly when loading is slow, and when start-up fails says that too with a retry and copyable details.
     Parts: brand-loaders.braille, brand-loaders.dot-matrix, brand-loaders.logo. Slots: mark (the host's official mark), footer.
     name, state (loading | failed), stage, progress (0..100 or null), slow-after-ms (8000; 0 turns the line off), error (['message', 'detail']),
     retry (shows "Try again"; it fires nq:retry on the splash), retry-href (the button becomes a link), labels (array overrides: starting, slow, failedTitle, failedBody, retry, details, copyDetails).
     The slow line needs the Alpine runtime. --}}
@props(['name' => null, 'state' => 'loading', 'stage' => null, 'progress' => null, 'slowAfterMs' => 8000, 'error' => null, 'retry' => false, 'retryHref' => null, 'labels' => []])
@php
    $t = array_merge([
        'starting' => \Nasaq\Nasaq::t('Getting things ready', 'جارٍ تجهيز كل شيء'),
        'slow' => \Nasaq\Nasaq::t('This is taking longer than usual. Still trying.', 'يستغرق هذا وقتًا أطول من المعتاد. ما زلنا نحاول.'),
        'failedTitle' => \Nasaq\Nasaq::t('Could not start', 'تعذّر البدء'),
        'failedBody' => \Nasaq\Nasaq::t('We could not finish starting. Try again. If it keeps failing, send the details below to support.', 'لم نتمكن من إكمال التشغيل. حاول مرة أخرى، وإن استمر الفشل أرسل التفاصيل أدناه إلى الدعم.'),
        'retry' => \Nasaq\Nasaq::t('Try again', 'حاول مرة أخرى'),
        'details' => \Nasaq\Nasaq::t('Details', 'التفاصيل'),
        'copyDetails' => \Nasaq\Nasaq::t('Copy details', 'نسخ التفاصيل'),
    ], $labels);
    $failed = $state === 'failed';
    $hasMark = trim((string) ($mark ?? '')) !== '';
    $hasProgress = is_numeric($progress);
    $message = $error['message'] ?? null;
    $detail = $error['detail'] ?? null;
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'boot-splash') }}" data-state="{{ $state }}" @unless ($failed) aria-busy="true" @endunless
    x-data="nqBootSplash({{ $failed ? 0 : (int) $slowAfterMs }})"
    {{ $attributes->except('data-slot')->cn('flex min-h-dvh flex-col items-center bg-background p-6 text-foreground') }}>
    <div class="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 text-center">
        @if ($failed)
            <span data-slot="boot-splash-mark" aria-hidden="true" class="inline-flex items-center justify-center" style="width: 96px; height: 96px">
                @if ($hasMark){{ $mark }}@else<x-nq::product-mark :size="56" title="" />@endif
            </span>
        @else
            @if ($hasMark)
                <x-nq::brand-loaders.logo :size="56" variant="ring" :value="$hasProgress ? $progress : null" :label="$stage ?? $t['starting']"><x-slot:mark>{{ $mark }}</x-slot:mark></x-nq::brand-loaders.logo>
            @else
                <x-nq::brand-loaders.logo :size="56" variant="ring" :value="$hasProgress ? $progress : null" :label="$stage ?? $t['starting']" />
            @endif
        @endif
        @if ($name)<p class="text-h3 text-foreground">{{ $name }}</p>@endif
        @if ($failed)
            <div role="alert" class="flex w-full flex-col items-center gap-3">
                <h1 class="text-h3 text-foreground">{{ $t['failedTitle'] }}</h1>
                <p class="text-body-sm text-foreground">{{ $message ?? $t['failedBody'] }}</p>
                @if ($message)<p class="text-caption text-muted-foreground">{{ $t['failedBody'] }}</p>@endif
                @if ($detail)
                    <div class="flex w-full items-center gap-2 rounded-control border border-border bg-muted py-1 ps-3 pe-1">
                        <span class="sr-only">{{ $t['details'] }}</span>
                        <code dir="ltr" class="min-w-0 flex-1 truncate text-start font-mono text-caption text-foreground">{{ $detail }}</code>
                        <x-nq::copy-button :value="$detail" :label="$t['copyDetails']" />
                    </div>
                @endif
                @if ($retry || $retryHref)
                    <x-nq::button variant="primary" :href="$retryHref" x-on:click="retry()">
                        <x-lucide-refresh-cw aria-hidden="true" />
                        {{ $t['retry'] }}
                    </x-nq::button>
                @endif
            </div>
        @else
            <div class="flex flex-col items-center gap-1.5" role="status" aria-live="polite">
                <p class="text-body-sm text-foreground">{{ $stage ?? $t['starting'] }}</p>
                @if ($hasProgress)
                    <p class="text-caption text-muted-foreground tabular-nums"><x-nq::numeric :value="(int) round(min(100, max(0, (float) $progress)))" />%</p>
                @endif
                @if ((int) $slowAfterMs > 0)
                    <p class="text-caption text-muted-foreground" x-show="slow" style="display: none">{{ $t['slow'] }}</p>
                @endif
            </div>
        @endif
    </div>
    @if (trim((string) ($footer ?? '')) !== '')<div class="text-caption text-muted-foreground">{{ $footer }}</div>@endif
</div>

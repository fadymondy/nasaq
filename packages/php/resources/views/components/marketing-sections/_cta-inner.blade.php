{{-- Internal: the inside of cta-banner (the same markup with or without the aurora around it). --}}
@php($has = fn ($v) => $v !== null && trim((string) $v) !== '')
<div class="{{ \Nasaq\Cn::merge('relative flex min-w-0 flex-col gap-6 p-6 @2xl:p-10', $split ? '@2xl:flex-row @2xl:items-center @2xl:justify-between' : 'items-center text-center') }}">
    <div class="{{ \Nasaq\Cn::merge('flex min-w-0 max-w-xl flex-col gap-2', ! $split ? 'items-center' : '') }}">
        <{{ $titleAs }} id="{{ $headingId }}" class="font-semibold text-foreground text-h2 text-balance">{{ $title }}</{{ $titleAs }}>
        @if ($has($description))<p class="text-body-sm text-nq-fg-body text-pretty">{{ $description }}</p>@endif
    </div>
    <div class="{{ \Nasaq\Cn::merge('flex min-w-0 flex-col gap-2', $split ? '@2xl:items-end' : 'items-center') }}">
        <div class="{{ \Nasaq\Cn::merge('flex flex-wrap gap-2', ! $split ? 'justify-center' : '') }}">
            {{ $action }}
            {{ $secondaryAction }}
        </div>
        @if ($has($note))<p class="text-caption text-muted-foreground">{{ $note }}</p>@endif
    </div>
</div>

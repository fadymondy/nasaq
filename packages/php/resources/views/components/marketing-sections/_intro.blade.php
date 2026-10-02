{{-- Internal: the eyebrow, title and description at the top of a marketing section. Included with
     @include('nasaq::components.marketing-sections._intro', [...]) and the variables eyebrow, title, description, headingId, titleAs, align (start | center). --}}
@php
    $has = fn ($v) => $v !== null && trim((string) $v) !== '';
    $introAlign = $align ?? 'start';
@endphp
@if ($has($title) || $has($eyebrow) || $has($description))
    <div class="{{ \Nasaq\Cn::merge('flex max-w-2xl flex-col gap-2', $introAlign === 'center' ? 'mx-auto items-center text-center' : '') }}">
        @if ($has($eyebrow))<div class="eyebrow text-nq-brand">{{ $eyebrow }}</div>@endif
        @if ($has($title))<{{ $titleAs }} id="{{ $headingId }}" class="font-semibold text-foreground text-h2 text-balance">{{ $title }}</{{ $titleAs }}>@endif
        @if ($has($description))<p class="text-body-sm text-nq-fg-body text-pretty">{{ $description }}</p>@endif
    </div>
@endif

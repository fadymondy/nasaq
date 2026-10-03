{{-- Internal: the icon, title and line every stage of <x-nq::subscription-landing> opens with. body is plain text; body-expr is an Alpine expression for text with the address in it. --}}
@props(['icon', 'title', 'body' => null, 'bodyExpr' => null])
<div class="flex flex-col items-center gap-3 text-center">
    <span aria-hidden="true" class="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6"><x-dynamic-component :component="'lucide-'.$icon" /></span>
    <h1 class="text-h3 text-foreground">{{ $title }}</h1>
    @if ($bodyExpr)
        <p dir="auto" class="text-body-sm text-muted-foreground" x-text="{{ $bodyExpr }}"></p>
    @elseif ($body)
        <p dir="auto" class="text-body-sm text-muted-foreground">{{ $body }}</p>
    @endif
</div>

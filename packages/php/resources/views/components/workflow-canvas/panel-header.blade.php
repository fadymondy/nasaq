{{-- The title row every workflow canvas side panel shares. Give title/hint as text, or titleExpr/hintExpr/iconExpr as Alpine expressions
     (the config panel's change with the selected node). The icon slot holds a static icon. --}}
@props(['title' => null, 'hint' => null, 'titleExpr' => null, 'hintExpr' => null, 'iconExpr' => null, 'closeLabel' => 'Close'])
<div data-slot="workflow-panel-header" class="flex items-start gap-3 border-b border-border px-4 py-3">
    @if (isset($icon) || $iconExpr)
        <span class="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4" @if ($iconExpr) x-html="{{ $iconExpr }}" @endif>{{ $icon ?? '' }}</span>
    @endif
    <div class="min-w-0 flex-1">
        <h2 class="text-label text-foreground" @if ($titleExpr) x-text="{{ $titleExpr }}" @endif>{{ $title }}</h2>
        <p class="text-caption text-muted-foreground" @if ($hintExpr) x-text="{{ $hintExpr }}" @endif>{{ $hint }}</p>
    </div>
    <x-nq::button variant="ghost" size="icon-sm" aria-label="{{ $closeLabel }}" title="{{ $closeLabel }}" x-on:click="closePanel()">
        <x-lucide-x aria-hidden="true" />
    </x-nq::button>
</div>

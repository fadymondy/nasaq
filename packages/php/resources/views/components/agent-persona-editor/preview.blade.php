{{-- <x-nq::agent-persona-editor.preview :persona="$agent" />
     The agent as its users will meet it: a coloured icon tile, name, tagline, traits and the greeting.
     persona: ['name', 'tagline', 'color' (hex or "--nq-tag-blue"), 'icon' (a lucide name), 'traits' => [], 'greeting'].
     live: inside <x-nq::agent-persona-editor> the card follows the draft (it uses the editor's Alpine state). labels: override of the built-in words. --}}
@include('nasaq::components.agent-persona-editor._logic')
@props(['persona', 'labels' => [], 'locale' => null, 'live' => false])
@php
    $locale ??= app()->getLocale();
    $t = nq_ape_words($locale, $labels);
    $p = $persona;
    $name = trim((string) ($p['name'] ?? ''));
    $color = trim((string) (($p['color'] ?? '') ?: '--nq-tag-gray'));
    $css = str_starts_with($color, '--') ? 'var('.$color.')' : $color;
    $traits = array_values($p['traits'] ?? []);
    $icon = (string) ($p['icon'] ?? '');
    $tileStyle = 'background-color: color-mix(in oklab, '.$css.' 16%, transparent); color: '.$css;
@endphp
<div data-slot="agent-persona-preview" {{ $attributes->cn('flex flex-col gap-3 rounded-card border border-border bg-card p-4')->except('data-slot') }}>
    <div class="flex items-center gap-3">
        <span aria-hidden="true" style="{{ $tileStyle }}"
            @if ($live) x-bind:style="{ backgroundColor: `color-mix(in oklab, ${css(draft.color)} 16%, transparent)`, color: css(draft.color) }" @endif
            class="inline-flex size-11 shrink-0 items-center justify-center rounded-control [&_svg]:size-5">
            @if ($live)
                <span class="contents" @if (! $icon) style="display: none" @endif x-show="draft.icon" x-html="iconHtml()">
                    @if ($icon)<x-nq::icon :name="$icon" />@endif
                </span>
                <span class="contents" @if ($icon) style="display: none" @endif x-show="! draft.icon"><x-lucide-bot /></span>
            @elseif ($icon)
                <x-nq::icon :name="$icon" />
            @else
                <x-lucide-bot />
            @endif
        </span>
        <div class="min-w-0">
            <p dir="auto" class="truncate text-label text-foreground" @if ($live) x-text="draft.name.trim() || @js($t['unnamed'])" @endif>{{ $name !== '' ? $name : $t['unnamed'] }}</p>
            @if ($live)
                <p dir="auto" class="truncate text-caption text-muted-foreground" x-show="draft.tagline" x-text="draft.tagline" @if (empty($p['tagline'])) style="display: none" @endif>{{ $p['tagline'] ?? '' }}</p>
            @elseif (! empty($p['tagline']))
                <p dir="auto" class="truncate text-caption text-muted-foreground">{{ $p['tagline'] }}</p>
            @endif
        </div>
    </div>
    @if ($live)
        <ul class="flex flex-wrap gap-1.5" aria-label="{{ $t['traits'] }}" x-show="draft.traits.length > 0" @if (! $traits) style="display: none" @endif>
            @foreach ($traits as $trait)
                <li data-ssr><x-nq::badge variant="outline" dir="auto">{{ $trait }}</x-nq::badge></li>
            @endforeach
            <template x-for="trait in draft.traits" :key="trait">
                <li><x-nq::badge variant="outline" dir="auto" x-text="trait"></x-nq::badge></li>
            </template>
        </ul>
        <p dir="auto" class="rounded-card rounded-ss-none bg-secondary px-3 py-2 text-body-sm text-foreground" x-show="draft.greeting" x-text="draft.greeting"
            @if (empty($p['greeting'])) style="display: none" @endif>{{ $p['greeting'] ?? '' }}</p>
    @else
        @if ($traits)
            <ul class="flex flex-wrap gap-1.5" aria-label="{{ $t['traits'] }}">
                @foreach ($traits as $trait)
                    <li><x-nq::badge variant="outline" dir="auto">{{ $trait }}</x-nq::badge></li>
                @endforeach
            </ul>
        @endif
        @if (! empty($p['greeting']))
            <p dir="auto" class="rounded-card rounded-ss-none bg-secondary px-3 py-2 text-body-sm text-foreground">{{ $p['greeting'] }}</p>
        @endif
    @endif
</div>

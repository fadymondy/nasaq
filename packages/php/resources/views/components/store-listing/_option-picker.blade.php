{{-- Internal: one option axis (swatches or buttons) of a product, as a radiogroup. Two modes:
     mode "ssr": @include with product, opt (the option array), selection, size (sm|md), max, label (show the option name). Static first paint.
     mode "tpl": inside a <template x-for="o in …"> that provides `o`; every state is bound to the enclosing scope's avail(), checked(),
     tabindexFor(), spoken(), pick(), previewValue(), keys(), swatch(o), vals(o, max), more(o, max), selectedLabel(o). --}}
@php
    $mode = $mode ?? 'ssr';
    $size = $size ?? 'md';
    $max = $max ?? 99;
    $label = $label ?? false;
    $selection = $selection ?? [];
    $sm = $size === 'sm';
    $base = 'relative shrink-0 outline-none transition-[box-shadow,border-color] duration-150 ease-nq motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-40';
    $swatchBase = 'rounded-full border border-nq-line-strong '.($sm ? 'size-5' : 'size-8');
    $swatchOn = 'ring-2 ring-primary ring-offset-2 ring-offset-background';
    $textBase = 'rounded-control border px-2.5 text-label tabular-nums '.($sm ? 'h-7 min-w-7 text-caption' : 'h-9 min-w-10');
    $textOn = 'border-primary bg-nq-selected text-foreground';
    $textOff = 'border-border bg-card text-foreground hover:bg-nq-hover';
    $outCls = 'text-muted-foreground line-through';
    $slash = 'absolute inset-0 rounded-full bg-[linear-gradient(to_top_right,transparent_46%,var(--nq-fg)_46%,var(--nq-fg)_54%,transparent_54%)] opacity-70';
    $groupCls = 'flex flex-wrap items-center gap-1.5';
@endphp
@if ($mode === 'ssr')
    @php
        $oid = $opt['id'];
        $swatch = in_array($opt['display'] ?? 'button', ['swatch', 'image'], true);
        $avail = nq_pdp_availability($product, $selection, $oid);
        $values = $opt['values'];
        $shown = array_slice($values, 0, $max);
        foreach (array_slice($values, $max) as $extra) {
            if (($selection[$oid] ?? null) === $extra['id']) { $shown[] = $extra; }
        }
        $hidden = count($values) - count($shown);
        $pickedLabel = collect($values)->firstWhere('id', $selection[$oid] ?? null)['label'] ?? '';
        $firstEnabled = collect($values)->first(fn ($v) => $avail[$v['id']] !== 'none')['id'] ?? null;
    @endphp
    <div data-slot="store-option-picker" data-ssr class="flex min-w-0 flex-col gap-1.5">
        @if ($label)
            <p class="text-label text-foreground">{{ $opt['name'] }} @if ($pickedLabel)<span class="ms-1.5 font-normal text-muted-foreground">{{ $pickedLabel }}</span>@endif</p>
        @endif
        <div role="radiogroup" aria-label="{{ $opt['name'] }}" class="{{ $groupCls }}">
            @foreach ($shown as $v)
                @php
                    $state = $avail[$v['id']];
                    $on = ($selection[$oid] ?? null) === $v['id'];
                    $cls = $base.' '.($swatch ? $swatchBase.($on ? ' '.$swatchOn : '') : $textBase.' '.($on ? $textOn : $textOff).($state === 'out' ? ' '.$outCls : ''));
                @endphp
                <button type="button" role="radio" aria-checked="{{ $on ? 'true' : 'false' }}" @if ($swatch) aria-label="{{ $v['label'] }}" @endif title="{{ $v['label'] }}"
                    @if ($state === 'none') disabled @endif tabindex="{{ $on || (! ($selection[$oid] ?? null) && $v['id'] === $firstEnabled) ? 0 : -1 }}" data-state="{{ $state }}"
                    class="{{ $cls }}" @if ($swatch && ! empty($v['color'])) style="background-color: {{ $v['color'] }}" @endif>
                    @if ($swatch)
                        @if (($opt['display'] ?? '') === 'image' && ! empty($v['image']))<x-nq::store-listing.product-image :src="$v['image']" alt="" class="rounded-full" />@endif
                        @if ($state === 'out')<span aria-hidden="true" class="{{ $slash }}"></span>@endif
                    @else
                        <bdi>{{ $v['label'] }}</bdi>
                    @endif
                </button>
            @endforeach
            @if ($hidden > 0)<span class="text-caption text-muted-foreground">{{ nq_sl_t('moreValues', ['n' => $hidden]) }}</span>@endif
        </div>
    </div>
@else
    <div data-slot="store-option-picker" class="flex min-w-0 flex-col gap-1.5">
        @if ($label ?? false)
            <p class="text-label text-foreground">
                <span x-text="o.name"></span>
                <span x-show="selectedLabel(o)" class="ms-1.5 font-normal text-muted-foreground" x-text="selectedLabel(o)"></span>
            </p>
        @endif
        <div role="radiogroup" x-bind:aria-label="o.name" class="{{ $groupCls }}" x-on:keydown="keys($event)" x-on:mouseleave="previewValue(null)">
            <template x-for="v in vals(o, {{ (int) $max }})" x-bind:key="v.id">
                <button type="button" role="radio" x-bind:aria-checked="checked(o.id, v.id) ? 'true' : 'false'"
                    x-bind:aria-label="swatch(o) ? spoken(v.label, o.id, v.id) : undefined" x-bind:title="v.label"
                    x-bind:disabled="avail(o.id, v.id) === 'none'" x-bind:tabindex="tabindexFor(o.id, v.id)" x-bind:data-state="avail(o.id, v.id)"
                    x-bind:class="[
                        '{{ $base }}',
                        swatch(o) ? '{{ $swatchBase }}' : '{{ $textBase }}',
                        swatch(o) ? (checked(o.id, v.id) ? '{{ $swatchOn }}' : '') : (checked(o.id, v.id) ? '{{ $textOn }}' : '{{ $textOff }}'),
                        !swatch(o) && avail(o.id, v.id) === 'out' ? '{{ $outCls }}' : '',
                    ]"
                    x-bind:style="swatch(o) && v.color ? { backgroundColor: v.color } : {}"
                    x-on:click="pick(o.id, v.id)" x-on:mouseenter="previewValue(v.id)" x-on:focus="previewValue(v.id)" x-on:blur="previewValue(null)">
                    <span class="contents" x-show="swatch(o)">
                        <span class="contents" x-show="o.display === 'image' && v.image"><x-nq::store-listing.product-image src-expr="v.image" alt-expr="''" class="rounded-full" /></span>
                        <span x-show="avail(o.id, v.id) === 'out'" aria-hidden="true" class="{{ $slash }}"></span>
                    </span>
                    <bdi x-show="!swatch(o)" x-text="v.label"></bdi>
                </button>
            </template>
            <span x-show="more(o, {{ (int) $max }}) > 0" class="text-caption text-muted-foreground" x-text="s('moreValues', { n: more(o, {{ (int) $max }}) })"></span>
        </div>
    </div>
@endif

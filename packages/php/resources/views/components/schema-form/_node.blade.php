{{-- Internal: the children of one object of the schema form: fields and lists in a grid, then nested objects as fieldsets (this partial again).
     Variables: $node (an object of the tree), $pre, $suf (its path), $depth, $lv (how many lists enclose it), $t, $rels, $disabled. --}}
@php
    $kids = array_values((array) ($node['children'] ?? []));
    $loose = array_values(array_filter($kids, fn ($c) => $c['kind'] !== 'object'));
    $objects = array_values(array_filter($kids, fn ($c) => $c['kind'] === 'object'));
    $pathAttr = function (?string $cpre, string $csuf): string {
        return $cpre === null ? 'data-schema-path="'.e($csuf).'"' : 'x-bind:data-schema-path="'.e(nq_sf_p($cpre, $csuf)).'"';
    };
@endphp
@if ($loose)
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        @foreach ($loose as $c)
            @php
                [$cpre, $csuf] = nq_sf_child($pre, $suf, $c['key']);
                $CP = nq_sf_p($cpre, $csuf);
                $f = $c['kind'] === 'field' ? $c['field'] : null;
                $wide = $f ? ($f['type'] === 'switch' || ($f['type'] === 'text' && ! empty($f['multiline'])) || ($c['width'] ?? 'full') !== 'half') : (($c['width'] ?? 'full') !== 'half');
            @endphp
            <div x-show="visible({{ $CP }})" style="display: none" {!! $pathAttr($cpre, $csuf) !!} class="min-w-0{{ $wide ? ' sm:col-span-2' : '' }}">
                @if ($c['kind'] === 'field')
                    @include('nasaq::components.schema-form._leaf', ['node' => $c, 'P' => $CP])
                @else
                    @include('nasaq::components.schema-form._list', ['node' => $c, 'pre' => $cpre, 'suf' => $csuf])
                @endif
            </div>
        @endforeach
    </div>
@endif
@foreach ($objects as $o)
    @php
        [$opre, $osuf] = nq_sf_child($pre, $suf, $o['key']);
        $OP = nq_sf_p($opre, $osuf);
    @endphp
    <fieldset data-slot="schema-form-section" {!! $pathAttr($opre, $osuf) !!} x-show="! objHidden({{ $OP }})" style="display: none" @if ($disabled) disabled @endif
        class="{{ \Nasaq\Cn::merge('flex min-w-0 flex-col gap-4 border-0 p-0', $depth > 0 ? 'border-s border-border ps-4' : '') }}">
        <legend class="{{ \Nasaq\Cn::merge('mb-3 w-full pb-2 font-semibold text-foreground', $depth === 0 ? 'border-b border-border text-h4' : 'text-label') }}">{{ $o['label'] }}</legend>
        @if (! empty($o['description']))<p class="-mt-2 text-caption text-muted-foreground">{{ $o['description'] }}</p>@endif
        @include('nasaq::components.schema-form._node', ['node' => $o, 'pre' => $opre, 'suf' => $osuf, 'depth' => $depth + 1])
        <p role="alert" x-show="msg({{ $OP }})" x-text="msg({{ $OP }})" style="display: none" class="text-caption text-nq-danger-text"></p>
    </fieldset>
@endforeach

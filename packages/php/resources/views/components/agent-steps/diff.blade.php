{{-- <x-nq::agent-steps.diff :before="$old" :after="$new" :context="2" />
     Line diff of two texts: numbers, plus and minus marks, runs of unchanged lines folded. Always left to right. "No differences." when the
     texts match. Needs the Alpine runtime (@nasaqScripts).
     before, after: the texts. context: unchanged lines kept around each change (2).
     items-expr="diffOf(change)": inside another Alpine scope (the confirm rows), an expression that gives the folded rows instead of
     before / after. Keep it free of && < > and apostrophes. --}}
@props(['before' => '', 'after' => '', 'context' => 2, 'itemsExpr' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $own = $itemsExpr === null;
    $items = $itemsExpr ?? 'diffItems()';
@endphp
<div @if ($own) x-data="nqAgentDiff({!! \Illuminate\Support\Js::from(['before' => (string) $before, 'after' => (string) $after, 'context' => (int) $context])->toHtml() !!})" @endif class="contents">
    <p data-slot="{{ $attributes->get('data-slot', 'agent-diff') }}" x-show="{{ $items }}.length === 0" x-cloak style="display: none"
        {{ $attributes->except('data-slot')->cn('text-caption text-muted-foreground') }}>{{ $t('No differences.', 'لا اختلافات.') }}</p>
    <div dir="ltr" role="table" aria-label="{{ $t('Changes', 'التغييرات') }}" data-slot="{{ $attributes->get('data-slot', 'agent-diff') }}" x-show="{{ $items }}.length > 0" x-cloak style="display: none"
        {{ $attributes->except('data-slot')->cn('overflow-x-auto rounded-control border border-border font-mono text-code') }}>
        <template x-for="(it, i) in {{ $items }}" :key="i">
            <div role="row" x-bind:data-diff="it.type === 'gap' ? null : it.type" x-bind:dir="it.type === 'gap' ? 'auto' : null"
                x-bind:class="it.type === 'gap' ? 'bg-nq-surface-soft px-3 py-1 text-center text-caption text-muted-foreground' : (it.type === 'add' ? 'flex min-w-max bg-nq-success-soft' : (it.type === 'del' ? 'flex min-w-max bg-nq-danger-soft' : 'flex min-w-max'))">
                <span x-show="it.type === 'gap'" x-text="$nq.t(it.count + ' unchanged lines', it.count + ' أسطر دون تغيير')"></span>
                <span x-show="it.type !== 'gap'" role="cell" aria-hidden="true" class="w-9 shrink-0 select-none px-2 text-end tabular-nums text-muted-foreground" x-text="it.oldLine ?? ''"></span>
                <span x-show="it.type !== 'gap'" role="cell" aria-hidden="true" class="w-9 shrink-0 select-none px-2 text-end tabular-nums text-muted-foreground" x-text="it.newLine ?? ''"></span>
                <span x-show="it.type !== 'gap'" role="cell" class="w-5 shrink-0 select-none text-center font-semibold" x-bind:aria-label="it.type === 'add' ? $nq.t('Added line', 'سطر مضاف') : (it.type === 'del' ? $nq.t('Removed line', 'سطر محذوف') : null)"
                    x-text="it.type === 'add' ? '+' : (it.type === 'del' ? '−' : '')"></span>
                <span x-show="it.type !== 'gap'" role="cell" class="whitespace-pre pe-3 text-foreground" x-text="it.text || ' '"></span>
            </div>
        </template>
    </div>
</div>

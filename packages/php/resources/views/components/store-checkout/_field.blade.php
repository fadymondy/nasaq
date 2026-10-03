{{-- Internal: one labelled control of the checkout, as plain tags so it reads the checkout scope (no nested Field scope to shadow it).
     Needs $id (static), $label (text), $model (x-model expression), $msg (Alpine expression: the problem text, "" when fine); optional $kind (input | textarea | select),
     $ltr, $show (x-show expression), $class, $extra (raw attributes on the control), $options (raw option markup for a select), $hint (Alpine expression for the description), $hintText (static description), $labelExpr (Alpine expression for a label that follows the state). --}}
@php
    $kind = $kind ?? 'input';
    $control = 'w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none placeholder:text-muted-foreground focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]';
    $describe = $id.'-d';
    $errorId = $id.'-e';
@endphp
<div data-slot="field" @isset($show) x-show="{{ $show }}" style="display: none" @endisset class="flex flex-col gap-1.5 {{ $class ?? '' }}">
    <label data-slot="field-label" for="{{ $id }}" class="text-label text-foreground" @isset($labelExpr) x-text="{{ $labelExpr }}" @endisset>{{ $label ?? '' }}</label>
    @if ($kind === 'select')
        <div data-slot="native-select" class="relative w-full min-w-0">
            <select id="{{ $id }}" x-model="{{ $model }}" aria-describedby="{{ $errorId }}" x-bind:aria-invalid="{{ $msg }} ? 'true' : null" x-bind:data-invalid="{{ $msg }} ? '' : null" {!! $extra ?? '' !!}
                class="w-full min-w-0 appearance-none rounded-control border border-input bg-card ps-3 pe-9 text-body text-foreground min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-invalid:border-nq-danger aria-invalid:border-nq-danger disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px] h-control">
                {!! $options ?? '' !!}
            </select>
            <x-lucide-chevron-down aria-hidden="true" class="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
    @elseif ($kind === 'textarea')
        <textarea data-slot="textarea" id="{{ $id }}" x-model="{{ $model }}" rows="3" aria-describedby="{{ $describe }} {{ $errorId }}" x-bind:aria-invalid="{{ $msg }} ? 'true' : null" x-bind:data-invalid="{{ $msg }} ? '' : null" {!! $extra ?? '' !!}
            class="{{ $control }} min-h-20 py-2"></textarea>
    @else
        <input data-slot="input" id="{{ $id }}" x-model="{{ $model }}" aria-describedby="{{ $describe }} {{ $errorId }}" x-bind:aria-invalid="{{ $msg }} ? 'true' : null" x-bind:data-invalid="{{ $msg }} ? '' : null" {!! $extra ?? '' !!}
            @if (! empty($ltr)) dir="ltr" @endif class="{{ $control }} h-control {{ ! empty($ltr) ? 'text-start' : '' }}">
    @endif
    @if (isset($hint) || isset($hintText))
        <p data-slot="field-description" id="{{ $describe }}" x-show="! ({{ $msg }})" class="text-caption text-muted-foreground" @isset($hint) x-text="{{ $hint }}" @endisset>{{ $hintText ?? '' }}</p>
    @endif
    <div data-slot="field-error" id="{{ $errorId }}" role="alert" x-show="{{ $msg }}" style="display: none" x-text="{{ $msg }}" class="text-caption text-nq-danger-text"></div>
</div>

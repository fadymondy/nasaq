{{-- <x-nq::brand-loaders.dot-matrix :value="62" />   <x-nq::brand-loaders.dot-matrix :value="null" />   <x-nq::brand-loaders.dot-matrix x-model="percent" :value="0" />
     A benday-dot matrix progress fill. value: 0..100, or null for an indeterminate sweep (needs the Alpine runtime). cols (24), rows (5), pitch px (10), label.
     x-modelable: x-model on the root updates the fill. Always runs left to right, also in RTL. The sweep stands still under prefers-reduced-motion. --}}
@props(['value' => null, 'cols' => 24, 'rows' => 5, 'pitch' => 10, 'label' => null])
@php
    $label ??= \Nasaq\Nasaq::t('Loading', 'جارٍ التحميل');
    $cols = (int) $cols;
    $rows = (int) $rows;
    $determinate = $value !== null;
    $clamp = fn ($v) => is_numeric($v) ? min(100, max(0, (float) $v)) : 0.0;
    $progress = $determinate ? ($clamp($value) / 100) * ($cols + 0.5) : 0;
    $levels = [];
    for ($r = 0; $r < $rows; $r++) {
        for ($c = 0; $c < $cols; $c++) {
            $levels[] = $determinate ? min(1, max(0, $progress - $c - ($r % 2) * 0.5)) : 0;
        }
    }
    $dot = round($pitch * 0.62, 3);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'dot-matrix-fill') }}" role="progressbar" aria-label="{{ $label }}"
    @if ($determinate) aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ round($clamp($value)) }}" @endif
    dir="ltr" x-data="nqDotMatrixFill({{ $cols }}, {{ $rows }}, {{ $determinate ? $clamp($value) : 'null' }})" x-modelable="value"
    style="grid-template-columns: repeat({{ $cols }}, {{ $pitch }}px); grid-auto-rows: {{ $pitch }}px"
    {{ $attributes->except(['data-slot', 'style'])->cn('inline-grid') }}>
    @foreach ($levels as $level)
        <span aria-hidden="true" class="flex items-center justify-center">
            <span data-dot class="{{ \Nasaq\Cn::merge('block rounded-full transition-[transform,opacity] duration-150 ease-nq motion-reduce:transition-none', $level > 0 ? 'bg-primary' : 'bg-border') }}"
                style="width: {{ $dot }}px; height: {{ $dot }}px; transform: scale({{ number_format(0.35 + 0.65 * $level, 3, '.', '') }}); opacity: {{ $level > 0 ? round(0.35 + 0.65 * $level, 3) : 1 }}"></span>
        </span>
    @endforeach
</div>

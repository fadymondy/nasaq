{{-- <x-nq::table label="Issues"> <x-nq::table.header> <x-nq::table.row> <x-nq::table.head>Key</x-nq::table.head> ... --}}
{{-- Parts: table.header, table.body, table.footer, table.row, table.head, table.cell, table.caption.
     Scrolls horizontally inside its own box. label: the accessible name of that scroll region (localise it).
     density: compact | default | comfortable. frame: rounded border and tinted header. bordered: column lines.
     striped: every other body row tinted. hover: highlight the row under the pointer (default true). --}}
@props(['label' => null, 'density' => 'default', 'frame' => false, 'bordered' => false, 'striped' => false, 'hover' => true])
<div data-slot="table-container" role="region" tabindex="0" @if ($label) aria-label="{{ $label }}" @endif
    class="{{ \Nasaq\Cn::merge('relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', $frame ? 'rounded-card border border-border bg-card' : '') }}">
    <table data-slot="table" data-density="{{ $density }}"
        @if ($frame) data-frame @endif @if ($bordered) data-bordered @endif @if ($striped) data-striped @endif
        {{ $attributes->cn([
            'w-full caption-bottom border-collapse text-body-sm',
            '[&_thead]:bg-secondary/50' => $frame,
            '[&_td:not(:last-child)]:border-e [&_td]:border-border [&_th:not(:last-child)]:border-e [&_th]:border-border' => $bordered,
        ]) }}>
        {{ $slot }}
    </table>
</div>

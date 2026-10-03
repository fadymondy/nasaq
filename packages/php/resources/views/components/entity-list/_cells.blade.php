{{-- Internal: helper of the entity-list consumers (brain-list, company-list, …). Included with @include('nasaq::components.entity-list._cells'); defined once.
     nq_el_cells($blade, $data): renders a Blade string of <template data-cell="id">…</template> blocks and returns [id => html], the server-rendered
     cells a column of 'type' => 'html' shows (row field named by the column's key). --}}
@php
    if (! function_exists('nq_el_cells')) {
        function nq_el_cells(string $blade, array $data): array
        {
            $html = \Illuminate\Support\Facades\Blade::render($blade, $data);
            preg_match_all('/<template data-cell="(\w+)">(.*?)<\/template>/s', $html, $m, PREG_SET_ORDER);

            return collect($m)->mapWithKeys(fn ($x) => [$x[1] => trim($x[2])])->all();
        }
    }
@endphp

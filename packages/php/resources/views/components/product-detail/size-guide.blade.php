{{-- <x-nq::product-detail.size-guide :guide="['columns' => ['Size', 'Chest'], 'rows' => [['S', '92'], ['M', '98']]]" selected="M" />
     A "Size guide" link button that opens a dialog with a measurements table. guide: [title?, description?, columns, rows, footer?].
     selected: the size to highlight (the row whose first cell matches). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['guide', 'selected' => null])
<x-nq::dialog>
    <x-nq::dialog.trigger variant="link" size="sm" {{ $attributes->cn('gap-1 text-caption') }}>
        <x-lucide-ruler aria-hidden="true" />
        {{ \Nasaq\Nasaq::t('Size guide', 'دليل المقاسات') }}
    </x-nq::dialog.trigger>
    <x-nq::dialog.content>
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $guide['title'] ?? \Nasaq\Nasaq::t('Size guide', 'دليل المقاسات') }}</x-nq::dialog.title>
            <x-nq::dialog.description>{{ $guide['description'] ?? \Nasaq\Nasaq::t('Measurements of the finished product.', 'قياسات المنتج النهائي.') }}</x-nq::dialog.description>
        </x-nq::dialog.header>
        <div class="overflow-x-auto rounded-control border border-border">
            <table class="w-full min-w-max border-collapse text-body-sm">
                <thead class="bg-secondary text-start">
                    <tr>
                        @foreach ($guide['columns'] as $c)
                            <th scope="col" class="px-3 py-2 text-start text-label text-foreground">{{ $c }}</th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach ($guide['rows'] as $row)
                        <tr @if (($row[0] ?? null) === $selected) data-selected @endif class="border-t border-border data-selected:bg-nq-selected">
                            @foreach ($row as $i => $cell)
                                <td class="px-3 py-2 tabular-nums {{ $i === 0 ? 'text-label text-foreground' : 'text-muted-foreground' }}"><bdi>{{ $cell }}</bdi></td>
                            @endforeach
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        @if (! empty($guide['footer']))
            <div class="text-caption text-muted-foreground">{{ $guide['footer'] }}</div>
        @endif
    </x-nq::dialog.content>
</x-nq::dialog>

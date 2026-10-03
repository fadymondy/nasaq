<x-nq::scroll-area label="Notes" class="h-64 w-72 rounded-card border border-border">
    <ul class="flex flex-col gap-2 p-3 text-body-sm">
        @foreach (range(1, 24) as $i)
            <li>Note {{ $i }}</li>
        @endforeach
    </ul>
</x-nq::scroll-area>

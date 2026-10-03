<div class="flex max-w-md flex-col gap-4">
    <x-nq::text-utilities.linkify text="Docs at https://nasaq-ui.fadymondy.com or write to hello@example.com." />
    <x-nq::text-utilities.user-text block :lines="2" linkify>مرحبا Sara, see www.example.com for the details of the plan we discussed on Sunday.</x-nq::text-utilities.user-text>
    <x-nq::text-utilities.translatable-text original="مرحبًا بك في الفريق" source-lang="ar" target-lang="en" fetch />
    <x-nq::text-utilities.scroll-fade>
        @foreach (range(1, 12) as $n)<span class="shrink-0 rounded-control border px-3 py-1">Chip {{ $n }}</span>@endforeach
    </x-nq::text-utilities.scroll-fade>
    <x-nq::text-utilities.bookmark-button show-label />
    <x-nq::text-utilities.progressive-reveal :collapsed-height="48"><p>One long paragraph that would be clamped in a real browser because it is taller than the limit.</p></x-nq::text-utilities.progressive-reveal>
    <x-nq::text-utilities.progressive-list :items="['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven']" />
</div>

{{-- <x-nq::artifact-renderer.list :artifacts="$extracted['artifacts']" />
     Several artifacts in a row of the conversation, one after another. Each is validated on its own. artifacts: payloads or the results of
     extractArtifacts. Same events and options as <x-nq::artifact-renderer>. --}}
@props(['artifacts' => [], 'allowHtml' => false, 'labels' => [], 'locale' => null])
<div data-slot="{{ $attributes->get('data-slot', 'artifact-list') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    @foreach ($artifacts as $item)
        <x-nq::artifact-renderer :artifact="$item" :allow-html="$allowHtml" :labels="$labels" :locale="$locale" />
    @endforeach
</div>

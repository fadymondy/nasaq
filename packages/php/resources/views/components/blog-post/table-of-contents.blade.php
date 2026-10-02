{{-- <x-nq::blog-post.table-of-contents :items="nq_bp_toc($markdown)" />   "On this page": a rail of heading links, the current one highlighted.
     items: id, text, level (3 and deeper are indented). title: default "On this page". Inside <x-nq::blog-post> the links scroll smoothly and
     follow the reader (aria-current="location"); the scope's `active`, `isActive()` and `go()` come from nqBlogPost. --}}
@props(['items' => [], 'title' => null])
@include('nasaq::components.blog-post._logic')
@php $title ??= nq_bp_words()['onThisPage']; @endphp
@if (count($items))
    <nav data-slot="{{ $attributes->get('data-slot', 'table-of-contents') }}" aria-label="{{ $title }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-2') }}>
        <p class="eyebrow">{{ $title }}</p>
        <ol class="flex flex-col border-s border-border">
            @foreach ($items as $item)
                <li>
                    <a href="#{{ $item['id'] }}" data-id="{{ $item['id'] }}" dir="auto" x-on:click="go($event)" x-bind:aria-current="isActive($el) ? 'location' : null"
                        x-bind:class="isActive($el) ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                        class="-ms-px block border-s-2 py-1 text-body-sm outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nq-focus {{ $item['level'] >= 3 ? 'ps-6' : 'ps-3' }}">{{ $item['text'] }}</a>
                </li>
            @endforeach
        </ol>
    </nav>
@endif

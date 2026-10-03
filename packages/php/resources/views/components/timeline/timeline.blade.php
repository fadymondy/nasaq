{{-- <x-nq::timeline><x-nq::timeline.item title="Assigned MH-142" :time="now()->subMinutes(5)" /></x-nq::timeline>
     A vertical list of events, newest first by convention, with a rail on the inline-start side.
     Live items: <x-nq::timeline items-expr="events" /> takes the events from an Alpine expression (an array of
     { title, description?, time? (ISO string or epoch ms), actor?: { name, avatar? } }) and renders them with the same markup as timeline.item.
     Items written in the slot are the server-rendered first paint; they are replaced as soon as the expression gives an array. The marker is the
     actor's avatar or a dot (no icon slot). Keep the expression free of && < > and apostrophes when it is passed through another x-nq:: component's attributes. --}}
@props(['itemsExpr' => null, 'locale' => null])
@php
    $locale ??= app()->getLocale();
@endphp
<ol data-slot="{{ $attributes->get('data-slot', 'timeline') }}"{!! $itemsExpr !== null ? ' x-data="nqTimeline('.\Illuminate\Support\Js::from(['locale' => $locale]).')" x-effect="sync('.e($itemsExpr).')"' : '' !!} {{ $attributes->except('data-slot')->cn('m-0 flex list-none flex-col p-0') }}>{{ $slot }}@if ($itemsExpr !== null)
        <template x-for="(it, i) in items" x-bind:key="i">
            <li data-slot="timeline-item" data-nq-dynamic class="group/timeline grid grid-cols-[2rem_1fr] gap-x-3">
                <div class="flex flex-col items-center">
                    <span data-slot="timeline-marker" class="flex size-8 shrink-0 items-center justify-center">
                        <template x-if="it.actor">
                            <span data-slot="avatar" x-data="nqAvatar(it.actor.avatar ? 400 : 0)" class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground size-8 text-caption rounded-full">
                                <template x-if="it.actor.avatar"><img data-slot="avatar-image" x-bind:src="it.actor.avatar" x-bind:alt="it.actor.name" class="size-full object-cover" style="display: none" x-bind="image"></template>
                                <span data-slot="avatar-fallback" class="flex size-full items-center justify-center" x-bind="fallback" x-text="initials(it.actor.name)"></span>
                            </span>
                        </template>
                        <template x-if="! it.actor"><span aria-hidden="true" class="size-2.5 rounded-full border-2 border-nq-line bg-background"></span></template>
                    </span>
                    <span aria-hidden="true" data-slot="timeline-rail" class="my-1 w-px flex-1 bg-border group-last/timeline:hidden"></span>
                </div>
                <div data-slot="timeline-content" class="flex min-w-0 flex-col gap-1 pb-6 pt-1 group-last/timeline:pb-0">
                    <div class="flex items-baseline justify-between gap-3">
                        <p class="min-w-0 text-body-sm font-medium text-foreground" x-text="it.title"></p>
                        <template x-if="it.time"><time data-slot="date-time" dir="auto" class="shrink-0 text-caption text-muted-foreground tabular-nums [unicode-bidi:isolate]" x-bind:datetime="iso(it.time)" x-bind:title="iso(it.time)" x-text="ago(it.time)"></time></template>
                    </div>
                    <template x-if="it.description"><p class="text-body-sm text-muted-foreground" x-text="it.description"></p></template>
                </div>
            </li>
        </template>
@endif</ol>

{{-- <x-nq::carousel.play-pause />: pause / start button for autoplay. Hidden when autoplay is off or reduced motion is requested. --}}
<x-nq::button variant="ghost" size="icon-sm" x-bind="playPause" style="display: none"
    {{ $attributes->merge(['data-slot' => 'carousel-play-pause']) }}>
    <x-nq::icon name="pause" x-show="playing" />
    <x-nq::icon name="play" x-show="!playing" style="display: none" />
</x-nq::button>

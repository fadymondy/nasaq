{{-- <x-nq::appearance-pickers> <x-nq::appearance-pickers.theme-gallery .../> <x-nq::appearance-pickers.reading-settings /> <x-nq::appearance-pickers.wallpaper-picker .../> </x-nq::appearance-pickers>
     A plain stack for the three pickers (theme-gallery, reading-settings, wallpaper-picker); each also works on its own. Needs the Alpine runtime (@nasaqScripts). --}}
<div data-slot="appearance-pickers" {{ $attributes->cn('flex min-w-0 flex-col gap-6') }}>{{ $slot }}</div>

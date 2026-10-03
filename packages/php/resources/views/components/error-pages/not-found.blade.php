{{-- <x-nq::error-pages.not-found /> is <x-nq::error-pages kind="not-found">: it takes every prop and slot of error-pages. --}}
@props(['title' => null, 'description' => null, 'code' => true, 'logo' => true, 'errorId' => null, 'workspace' => null, 'moduleName' => null, 'eta' => null, 'online' => false, 'homeHref' => null, 'back' => false, 'retry' => false, 'supportHref' => null, 'switchWorkspaceHref' => null, 'requestAccess' => false, 'notify' => false, 'fullScreen' => true, 'labels' => []])
<x-nq::error-pages kind="not-found" :title="$title" :description="$description" :code="$code" :logo="$logo" :error-id="$errorId" :workspace="$workspace" :module-name="$moduleName" :eta="$eta" :online="$online" :home-href="$homeHref" :back="$back" :retry="$retry" :support-href="$supportHref" :switch-workspace-href="$switchWorkspaceHref" :request-access="$requestAccess" :notify="$notify" :full-screen="$fullScreen" :labels="$labels" {{ $attributes }}>
    <x-slot:actions>{{ $actions ?? '' }}</x-slot:actions>
    {{ $slot }}
</x-nq::error-pages>

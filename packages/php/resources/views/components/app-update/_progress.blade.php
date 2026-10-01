{{-- Internal: the download progress shared by app-update.sheet and app-update.forced-gate (port of DownloadProgress). Included with
     @include('nasaq::components.app-update._progress', ['t' => $t, 'status' => $status, 'progress' => $progress, 'id' => '...']).
     It lives inside an element with x-data="nqAppUpdate(...)" or "nqAppUpdateSheet(...)": it shows while status is "downloading" and follows progress / speed. --}}
@php
    $percent = nq_au_percent($progress);
    $show = $status === 'downloading';
@endphp
<div data-slot="update-progress" class="flex flex-col gap-1.5" x-show="status === 'downloading'" @unless ($show) style="display: none" @endunless>
    <div data-slot="progress" data-tone="default" role="progressbar" aria-labelledby="{{ $id }}-label" aria-valuemin="0" aria-valuemax="100"
        aria-valuenow="{{ round($percent) }}" aria-valuetext="{{ round($percent) }}%"
        x-bind:aria-valuenow="percent()" x-bind:aria-valuetext="rounded() + '%'"
        class="flex w-full flex-col gap-1.5">
        <div data-slot="progress-head" class="flex items-baseline justify-between gap-3 text-body-sm">
            <span id="{{ $id }}-label" class="text-label text-foreground">{{ $t['downloading'] }}</span>
            <span aria-hidden="true" class="text-muted-foreground tabular-nums" x-text="rounded() + '%'">{{ round($percent) }}%</span>
        </div>
        <div data-slot="progress-track" class="relative block h-2 w-full overflow-hidden rounded-full bg-nq-surface-soft">
            <div data-slot="progress-indicator" x-bind:style="{ width: percent() + '%' }" style="inset-inline-start:0;width:{{ round($percent, 4) }}%"
                class="block h-full rounded-full bg-primary transition-[width] duration-300 ease-nq motion-reduce:transition-none"></div>
        </div>
    </div>
    <p class="flex items-center justify-between text-caption text-muted-foreground tabular-nums">
        <span dir="ltr" x-text="speedText()"></span>
        <span dir="ltr" x-text="leftText()"></span>
    </p>
</div>

@php
    $locations = [
        ['id' => 'l1', 'path' => 'C:\Users\sara\projects\app', 'label' => 'App', 'status' => 'ready', 'permissions' => ['read' => true, 'write' => true, 'index' => true], 'primary' => true, 'fileCount' => 1240, 'indexedAt' => '2025-03-01T08:00:00Z'],
        ['id' => 'l2', 'path' => '/home/sara/notes', 'status' => 'ready', 'permissions' => ['read' => true, 'write' => false, 'index' => false], 'fileCount' => 38],
        ['id' => 'l3', 'path' => 'D:\archive', 'status' => 'missing', 'permissions' => ['read' => true, 'write' => false, 'index' => false]],
    ];
@endphp
<x-nq::desktop-locations :locations="$locations" can-browse
    x-on:nq-location-browse="$event.detail.waitUntil(Promise.resolve('C:\Users\sara\Documents'))"
    x-on:nq-location-add="$event.detail.waitUntil(Promise.resolve())"
    x-on:nq-location-remove="$event.detail.waitUntil(Promise.resolve())"
    x-on:nq-location-permissions="$event.detail.waitUntil(Promise.resolve())" />
<div class="mt-4 w-72">
    <x-nq::desktop-locations.picker :locations="$locations" requires="write" value="l1" aria-label="Save to" />
</div>

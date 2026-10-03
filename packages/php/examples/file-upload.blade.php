<div class="w-96" x-data="{
    send(item, controls) {
        let progress = 0;
        controls.update(item.id, { status: 'uploading', progress });
        const timer = setInterval(() => {
            progress = Math.min(100, progress + 20);
            controls.update(item.id, progress < 100 ? { status: 'uploading', progress } : { status: 'done', progress: 100 });
            if (progress >= 100) clearInterval(timer);
        }, 400);
    },
}">
    <x-nq::file-upload accept="image/*,.pdf" :max-size="5 * 1024 * 1024" :max-files="4"
        @files="$event.detail.added.forEach((f) => send(f, $event.detail.controls))"
        @retry="send($event.detail.item, $event.detail.controls)" />
</div>
<div class="mt-6">
    <x-nq::file-upload.image-upload alt="Profile picture" />
</div>

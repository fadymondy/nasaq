<x-nq::avatar-upload name="Sara Alharbi" :output-size="256"
    @nq-avatar-change="$event.detail.promise = upload($event.detail.file, $event.detail.onProgress)"
    @nq-avatar-remove="$event.detail.promise = removeAvatar()" />

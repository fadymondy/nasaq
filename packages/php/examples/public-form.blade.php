{{-- Your API call. Resolve { error: "…" } to keep the form and show a message; reject to show "Something went wrong". --}}
<div class="w-96">
    <x-nq::public-form.contact
        x-on:nq-public-form="$event.detail.waitUntil(fetch('/api/contact', { method: 'POST', body: JSON.stringify($event.detail.data) }))" />
</div>

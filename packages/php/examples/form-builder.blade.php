{{-- The form is the plain definition you store (nq_pf_contact() is the ready contact form). Your API call runs on save; the button stays busy until it resolves. --}}
@include('nasaq::components.public-form._logic')
<x-nq::form-builder :form="nq_pf_contact()" form-key="pk_live_123" embed-base-url="https://forms.example.com"
    x-on:nq-form-builder-save="$event.detail.waitUntil(fetch('/api/forms/1', { method: 'PUT', body: JSON.stringify($event.detail.form) }))" />

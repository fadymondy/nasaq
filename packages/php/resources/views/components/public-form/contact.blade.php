{{-- <x-nq::public-form.contact x-on:nq-public-form="$event.detail.waitUntil(send($event.detail.data))" />
     Name, email, topic, message and a honeypot: <x-nq::public-form> with the contact preset.
     topics: [ { value, label, labelAr? } ], default sales, support, something else. form: a form definition replacing the preset.
     Everything else (action, labels, submit-label, preview, default-values) goes to <x-nq::public-form>. --}}
@props(['topics' => null, 'form' => null])
@include('nasaq::components.public-form._logic')
<x-nq::public-form :form="$form ?? nq_pf_contact($topics)" {{ $attributes }} />

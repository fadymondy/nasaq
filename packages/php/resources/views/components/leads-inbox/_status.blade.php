{{-- Internal: the stage badge of a lead, from the Alpine expression $field (a status id) of the current scope. --}}
@foreach (['new' => 'info', 'contacted' => 'warning', 'qualified' => 'brand', 'converted' => 'success', 'spam' => 'danger'] as $status => $variant)
    <x-nq::badge variant="{{ $variant }}" x-show="{{ $field }} === '{{ $status }}'" style="display: none">{{ $L['statuses'][$status] }}</x-nq::badge>
@endforeach

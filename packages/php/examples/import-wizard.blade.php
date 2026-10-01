<x-nq::import-wizard
    :fields="[['key' => 'name', 'label' => 'Name', 'required' => true], ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true]]"
    unique-key="email"
    x-on:import="$event.detail.done({ imported: $event.detail.rows.length })" />

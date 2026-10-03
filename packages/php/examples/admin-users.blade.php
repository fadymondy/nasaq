@php
    $roles = [
        ['id' => 'admin', 'label' => 'Admin', 'description' => 'Full access'],
        ['id' => 'editor', 'label' => 'Editor', 'description' => 'Can edit content'],
        ['id' => 'viewer', 'label' => 'Viewer', 'description' => 'Read only'],
    ];
    $users = [
        ['id' => 'u1', 'name' => 'Sara Alharbi', 'email' => 'sara@acme.test', 'roles' => ['admin'], 'status' => 'active', 'verified' => true, 'lastActive' => '2026-09-28', 'createdAt' => '2026-01-12'],
        ['id' => 'u2', 'name' => 'Omar Nasser', 'email' => 'omar@acme.test', 'roles' => ['editor', 'viewer'], 'status' => 'active', 'verified' => false, 'lastActive' => null, 'createdAt' => '2026-05-03'],
        ['id' => 'u3', 'name' => 'Lina Haddad', 'email' => 'lina@acme.test', 'roles' => ['viewer'], 'status' => 'disabled', 'verified' => true, 'lastActive' => '2026-08-01', 'createdAt' => '2026-03-20'],
    ];
@endphp
<x-nq::admin-users :users="$users" :roles="$roles" current-user-id="u1" can-add can-verify can-set-disabled can-reset-password can-impersonate can-update-roles />

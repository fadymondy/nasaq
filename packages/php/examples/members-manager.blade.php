@php
    $roles = [
        ['id' => 'owner', 'label' => 'Owner', 'description' => 'Full control, including billing'],
        ['id' => 'admin', 'label' => 'Admin', 'description' => 'Manage members and settings'],
        ['id' => 'member', 'label' => 'Member', 'description' => 'Work in the workspace'],
    ];
    $members = [
        ['id' => 'm1', 'name' => 'Sara Alharbi', 'email' => 'sara@acme.test', 'role' => 'owner', 'joinedAt' => '2025-01-12', 'lastActive' => '2026-09-29'],
        ['id' => 'm2', 'name' => 'Omar Nasser', 'email' => 'omar@acme.test', 'role' => 'admin', 'joinedAt' => '2025-05-03', 'lastActive' => '2026-09-28'],
        ['id' => 'm3', 'name' => 'Lina Haddad', 'email' => 'lina@acme.test', 'role' => 'member', 'joinedAt' => '2026-03-20', 'lastActive' => null],
    ];
    $invites = [
        ['id' => 'i1', 'email' => 'new@acme.test', 'role' => 'member', 'invitedBy' => 'Sara Alharbi', 'sentAt' => '2026-09-27', 'expiresAt' => '2026-10-04'],
    ];
@endphp
<x-nq::members-manager :members="$members" :invites="$invites" :roles="$roles" current-user-id="m1" can-invite can-change-role can-remove can-resend can-revoke can-transfer can-leave />

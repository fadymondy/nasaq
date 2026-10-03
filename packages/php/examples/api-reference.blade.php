@php
    $tools = [
        [
            'id' => 'create_issue', 'name' => 'create_issue', 'summary' => 'Create an issue in a project.', 'category' => 'Issues',
            'scope' => 'issues:write', 'minRole' => 'Member', 'access' => 'write',
            'args' => [['name' => 'title', 'type' => 'string', 'required' => true, 'description' => 'Short title.']],
            'examples' => [['call' => '{ "title": "Fix login" }', 'result' => '{ "id": "MH-1" }']],
        ],
        [
            'id' => 'list_issues', 'name' => 'list_issues', 'summary' => 'List issues in a project.', 'category' => 'Issues',
            'scope' => 'issues:read', 'minRole' => 'Viewer',
            'args' => [['name' => 'limit', 'type' => 'integer', 'default' => '20', 'description' => 'How many to return.']],
            'examples' => [['call' => '{ "limit": 2 }', 'result' => '{ "items": [] }']],
        ],
        [
            'id' => 'delete_project', 'name' => 'delete_project', 'summary' => 'Delete a project and everything in it.', 'category' => 'Projects',
            'scope' => 'projects:admin', 'minRole' => 'Owner', 'access' => 'destructive',
        ],
    ];
@endphp
<x-nq::api-reference :tools="$tools" />

@php
    $rows = [
        ['key' => 'MH-728', 'title' => 'هيكل التطبيق v2', 'status' => 'قيد التنفيذ', 'hours' => '6.5'],
        ['key' => 'MH-718', 'title' => 'خط إنتاج الرموز', 'status' => 'مكتملة', 'hours' => '11.25'],
    ];
@endphp
<x-nq::table>
    <x-nq::table.header>
        <x-nq::table.row>
            <x-nq::table.head>المفتاح</x-nq::table.head>
            <x-nq::table.head>العنوان</x-nq::table.head>
            <x-nq::table.head>الحالة</x-nq::table.head>
            <x-nq::table.head class="text-end">الساعات</x-nq::table.head>
        </x-nq::table.row>
    </x-nq::table.header>
    <x-nq::table.body>
        @foreach ($rows as $r)
            <x-nq::table.row>
                <x-nq::table.cell class="font-mono text-caption text-muted-foreground" dir="ltr">{{ $r['key'] }}</x-nq::table.cell>
                <x-nq::table.cell class="font-medium">{{ $r['title'] }}</x-nq::table.cell>
                <x-nq::table.cell><x-nq::badge variant="info">{{ $r['status'] }}</x-nq::badge></x-nq::table.cell>
                <x-nq::table.cell class="text-end tabular-nums">{{ $r['hours'] }}</x-nq::table.cell>
            </x-nq::table.row>
        @endforeach
    </x-nq::table.body>
</x-nq::table>

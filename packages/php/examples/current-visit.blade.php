<x-nq::current-visit
    :patient="['name' => 'Huda Salem', 'age' => 34, 'gender' => 'Female', 'phone' => '+966 50 123 4567', 'allergies' => ['Penicillin', 'Latex'], 'conditions' => ['Asthma']]"
    service="Dental check-up"
    room="3"
    :started-at="now()->subMinutes(12)->subSeconds(34)"
    :now="now()->toIso8601String()"
    :working-weekdays="[0, 1, 2, 3, 4]"
    :history="[
        ['id' => 'v1', 'title' => 'Filling', 'summary' => 'Lower left molar.', 'date' => now()->subMonths(2)->toIso8601String()],
        ['id' => 'v2', 'title' => 'Cleaning', 'summary' => 'Scale and polish.', 'date' => now()->subMonths(8)->toIso8601String()],
    ]"
    :prescriptions="[['id' => 'rx1', 'drug' => 'Amoxicillin', 'dose' => '500 mg', 'frequency' => 'Twice daily', 'days' => 7]]" />
